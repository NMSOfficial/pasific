import { createDecipheriv, createHash } from 'node:crypto';
import { createRequesterClient } from './submissionLookup.ts';

interface SecureDocumentOcrDeps {
  supabaseUrl: string;
  anonKey: string;
  gradingServerSecret: string;
  geminiApiKey: string;
  integrationEncryptionKey?: string;
}

interface OcrInput {
  itemId: string;
  dataBase64?: string;
  mimeType?: string;
  sourceUrl?: string;
}

type DocumentImportKind = 'writing' | 'exam_template' | 'exam_attempt';

interface OcrPage {
  markdown?: string;
  confidence_scores?: {
    average_page_confidence_score?: number;
    minimum_page_confidence_score?: number;
  } | null;
}

interface OcrResponse {
  pages?: OcrPage[];
  document_annotation?: string | Record<string, unknown> | null;
  model?: string;
}

interface OcrAnnotation {
  studentName?: string;
  studentIdentifier?: string;
  answerText?: string;
  documentType?: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
]);
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MISTRAL_OCR_URL = 'https://api.mistral.ai/v1/ocr';
const RETRY_DELAY_MS = 1_500;

const OCR_ANNOTATION_SCHEMA = {
  type: 'object',
  properties: {
    studentName: { type: 'string' },
    studentIdentifier: { type: 'string' },
    answerText: { type: 'string' },
    documentType: { type: 'string' },
  },
  required: ['answerText'],
  additionalProperties: false,
};

function bearerToken(authHeader: string | undefined): string | null {
  return authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeExternalMessage(value: string, maxLength = 400): string {
  return value
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[redacted-url]')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[redacted-secret]')
    .slice(0, maxLength);
}

function encryptionKey(deps: SecureDocumentOcrDeps): Buffer {
  const seed = deps.integrationEncryptionKey?.trim() || deps.gradingServerSecret;
  return createHash('sha256').update(seed, 'utf8').digest();
}

function decryptSecret(value: string, deps: SecureDocumentOcrDeps): string {
  const [ivPart, tagPart, ciphertextPart] = value.split('.');
  if (!ivPart || !tagPart || !ciphertextPart) throw new Error('integration_secret_corrupt');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(deps), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

async function loadMistralKey(token: string, deps: SecureDocumentOcrDeps): Promise<string> {
  const client = createRequesterClient(token, deps);
  const { data, error } = await client.rpc('server_get_integration_secret', {
    p_provider: 'mistral',
    p_server_secret: deps.gradingServerSecret,
  });
  if (error || typeof data !== 'string' || !data) throw new Error('mistral_not_configured');
  return decryptSecret(data, deps);
}

function safeCloudUrl(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('cloud_url_must_be_https');
  const host = url.hostname.toLowerCase();
  const allowed = new Set([
    'drive.google.com',
    'docs.google.com',
    'storage.googleapis.com',
    'dropbox.com',
    'www.dropbox.com',
    '1drv.ms',
    'onedrive.live.com',
  ]);
  if (!allowed.has(host)) throw new Error('cloud_host_not_allowed');

  if (host === 'drive.google.com') {
    const match = url.pathname.match(/\/file\/d\/([^/]+)/);
    if (match?.[1]) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(match[1])}`;
    const id = url.searchParams.get('id');
    if (id) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  }

  if (host === 'docs.google.com') {
    const doc = url.pathname.match(/^\/document\/d\/([^/]+)/);
    if (doc?.[1]) return `https://docs.google.com/document/d/${encodeURIComponent(doc[1])}/export?format=pdf`;
    const presentation = url.pathname.match(/^\/presentation\/d\/([^/]+)/);
    if (presentation?.[1]) return `https://docs.google.com/presentation/d/${encodeURIComponent(presentation[1])}/export/pdf`;
    const sheet = url.pathname.match(/^\/spreadsheets\/d\/([^/]+)/);
    if (sheet?.[1]) return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheet[1])}/export?format=pdf`;
  }

  if (host.endsWith('dropbox.com')) url.searchParams.set('dl', '1');
  return url.toString();
}

function parseAnnotation(raw: OcrResponse['document_annotation']): OcrAnnotation {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as OcrAnnotation;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as OcrAnnotation : {};
  } catch {
    return {};
  }
}

function buildOcrRequestBody(
  document: Record<string, string>,
  kind: DocumentImportKind,
  withAnnotation: boolean,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    model: 'mistral-ocr-latest',
    document,
    include_blocks: true,
    confidence_scores_granularity: 'page',
  };

  if (kind === 'exam_template' || !withAnnotation) return base;

  return {
    ...base,
    document_annotation_format: {
      type: 'json_schema',
      json_schema: {
        name: 'student_document',
        strict: true,
        schema: OCR_ANNOTATION_SCHEMA,
      },
    },
    document_annotation_prompt: kind === 'writing'
      ? 'Extract the main handwritten or typed student writing response. If a student name or student number is visible, return it. Do not invent missing identity information. Preserve the student response faithfully in answerText.'
      : 'Extract any visible student name or student number. Put student-added answer content in answerText, but do not invent identity or answers. Raw OCR markdown will be used for grading.',
  };
}

async function sendMistralRequest(
  document: Record<string, string>,
  apiKey: string,
  kind: DocumentImportKind,
  withAnnotation: boolean,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 75_000);
  try {
    return await fetch(MISTRAL_OCR_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify(buildOcrRequestBody(document, kind, withAnnotation)),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('mistral_ocr_timeout');
    if (error instanceof TypeError) throw new Error('mistral_ocr_network_failed');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function runMistralOcr(input: OcrInput, apiKey: string, kind: DocumentImportKind): Promise<{
  text: string;
  markdown: string;
  payload: OcrResponse;
  annotation: OcrAnnotation;
  pageCount: number;
  confidence?: number;
}> {
  let document: Record<string, string>;
  if (input.sourceUrl) {
    document = { type: 'document_url', document_url: safeCloudUrl(input.sourceUrl) };
  } else {
    const mime = (input.mimeType || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime)) throw new Error('unsupported_document_type');
    if (!input.dataBase64) throw new Error('document_data_missing');
    const byteLength = Buffer.byteLength(input.dataBase64, 'base64');
    if (byteLength <= 0 || byteLength > MAX_DOCUMENT_BYTES) throw new Error('document_too_large');
    const dataUrl = `data:${mime};base64,${input.dataBase64}`;
    document = mime.startsWith('image/')
      ? { type: 'image_url', image_url: dataUrl }
      : { type: 'document_url', document_url: dataUrl };
  }

  const wantsAnnotation = kind !== 'exam_template';
  let response = await sendMistralRequest(document, apiKey, kind, wantsAnnotation);

  if (response.status === 429 || response.status === 503) {
    await wait(RETRY_DELAY_MS);
    response = await sendMistralRequest(document, apiKey, kind, wantsAnnotation);
  }

  if (!response.ok && wantsAnnotation && (response.status === 400 || response.status === 422)) {
    response = await sendMistralRequest(document, apiKey, kind, false);
  }

  if (response.status === 429 || response.status === 503) throw new Error('mistral_temporarily_unavailable');
  if (!response.ok) {
    const body = safeExternalMessage(await response.text(), 240);
    throw new Error(`mistral_ocr_failed_${response.status}:${body}`);
  }

  const payload = (await response.json()) as OcrResponse;
  const markdown = (payload.pages ?? [])
    .map((page) => page.markdown ?? '')
    .filter(Boolean)
    .join('\n\n')
    .trim();
  const annotation = parseAnnotation(payload.document_annotation);
  const annotationText = annotation.answerText?.trim() ?? '';
  const text = kind === 'writing' && annotationText ? annotationText : (markdown || annotationText);

  const confidences = (payload.pages ?? [])
    .map((page) => page.confidence_scores?.average_page_confidence_score)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const confidence = confidences.length
    ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
    : undefined;

  return {
    text: text.trim(),
    markdown,
    payload,
    annotation,
    pageCount: payload.pages?.length ?? 0,
    confidence,
  };
}

export async function processDocumentOcrSecure(
  authHeader: string | undefined,
  input: OcrInput,
  deps: SecureDocumentOcrDeps,
): Promise<{ itemId: string; textLength: number; pageCount: number }> {
  const token = bearerToken(authHeader);
  if (!token) throw new Error('Unauthorized');
  const client = createRequesterClient(token, deps);

  const { data: item, error: itemError } = await client
    .from('document_import_items')
    .select('id, mime_type')
    .eq('id', input.itemId)
    .maybeSingle();
  if (itemError || !item) throw new Error('document_item_not_found');
  if (!input.sourceUrl && input.mimeType && item.mime_type !== input.mimeType) throw new Error('document_mime_mismatch');

  let begun = false;
  try {
    const { data: kindValue, error: beginError } = await client.rpc('begin_server_document_ocr', {
      p_item_id: input.itemId,
      p_server_secret: deps.gradingServerSecret,
    });
    if (beginError) throw new Error(`document_ocr_begin_failed:${safeExternalMessage(beginError.message)}`);
    const kind = kindValue as DocumentImportKind;
    if (!['writing', 'exam_template', 'exam_attempt'].includes(kind)) throw new Error('invalid_document_batch_kind');
    begun = true;

    const apiKey = await loadMistralKey(token, deps);
    const result = await runMistralOcr(input, apiKey, kind);
    if (!result.text || result.pageCount < 1) throw new Error('ocr_returned_empty_text');

    const { error: completeError } = await client.rpc('complete_server_document_ocr', {
      p_item_id: input.itemId,
      p_server_secret: deps.gradingServerSecret,
      p_ocr_text: result.text,
      p_ocr_markdown: result.markdown || null,
      p_ocr_payload: result.payload,
      p_suggested_student_name: result.annotation.studentName ?? null,
      p_suggested_student_identifier: result.annotation.studentIdentifier ?? null,
      p_confidence: result.confidence ?? null,
      p_page_count: result.pageCount,
    });
    if (completeError) throw new Error(`document_ocr_complete_failed:${safeExternalMessage(completeError.message)}`);

    begun = false;
    return { itemId: input.itemId, textLength: result.text.length, pageCount: result.pageCount };
  } catch (error) {
    const message = safeExternalMessage(error instanceof Error ? error.message : 'ocr_failed', 500);
    if (begun) {
      await client.rpc('fail_server_document_ocr', {
        p_item_id: input.itemId,
        p_server_secret: deps.gradingServerSecret,
        p_error_message: message,
      }).catch(() => undefined);
    }
    throw new Error(message);
  }
}
