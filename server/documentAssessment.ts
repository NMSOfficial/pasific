import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createRequesterClient } from './submissionLookup.ts';

interface DocumentAssessmentDeps {
  supabaseUrl: string;
  anonKey: string;
  gradingServerSecret: string;
  geminiApiKey: string;
  integrationEncryptionKey?: string;
}

interface RequesterProfile {
  id: string;
  role: 'student' | 'teacher' | 'super_admin';
  status: string;
  expires_at?: string | null;
}

interface OcrInput {
  itemId: string;
  dataBase64?: string;
  mimeType?: string;
  sourceUrl?: string;
}

interface OcrPage {
  markdown?: string;
  confidence?: number;
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

interface ExamModelQuestion {
  key: string;
  label: string;
  maxPoints: number;
  score: number;
  explanation: string;
  evidenceQuote?: string;
  feedback?: string;
}

interface ExamModelResult {
  overallPercent: number;
  summary: string;
  questions: ExamModelQuestion[];
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
const MISTRAL_MODELS_URL = 'https://api.mistral.ai/v1/models';
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemma-4-31b-it';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

const EXAM_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    overallPercent: { type: 'NUMBER' },
    summary: { type: 'STRING' },
    questions: {
      type: 'ARRAY',
      minItems: 1,
      items: {
        type: 'OBJECT',
        properties: {
          key: { type: 'STRING' },
          label: { type: 'STRING' },
          maxPoints: { type: 'NUMBER' },
          score: { type: 'NUMBER' },
          explanation: { type: 'STRING' },
          evidenceQuote: { type: 'STRING' },
          feedback: { type: 'STRING' },
        },
        required: ['key', 'label', 'maxPoints', 'score', 'explanation'],
      },
    },
  },
  required: ['overallPercent', 'summary', 'questions'],
} as const;

function bearerToken(authHeader: string | undefined): string | null {
  return authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
}

async function requesterProfile(token: string, deps: DocumentAssessmentDeps): Promise<RequesterProfile | null> {
  const client = createRequesterClient(token, deps);
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user) return null;

  const { data, error } = await client
    .from('profiles')
    .select('id, role, status, expires_at')
    .eq('id', authData.user.id)
    .maybeSingle<RequesterProfile>();
  if (error || !data || data.status !== 'active') return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data;
}

function encryptionKey(deps: DocumentAssessmentDeps): Buffer {
  const seed = deps.integrationEncryptionKey?.trim() || deps.gradingServerSecret;
  return createHash('sha256').update(seed, 'utf8').digest();
}

function encryptSecret(value: string, deps: DocumentAssessmentDeps): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(deps), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

function decryptSecret(value: string, deps: DocumentAssessmentDeps): string {
  const [ivPart, tagPart, ciphertextPart] = value.split('.');
  if (!ivPart || !tagPart || !ciphertextPart) throw new Error('integration_secret_corrupt');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(deps), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

async function testMistralKey(apiKey: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(MISTRAL_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadMistralKey(token: string, deps: DocumentAssessmentDeps): Promise<string> {
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
  const allowed = [
    'drive.google.com',
    'docs.google.com',
    'storage.googleapis.com',
    'dropbox.com',
    'www.dropbox.com',
    '1drv.ms',
    'onedrive.live.com',
  ];
  if (!allowed.includes(host)) throw new Error('cloud_host_not_allowed');

  if (host === 'drive.google.com') {
    const match = url.pathname.match(/\/file\/d\/([^/]+)/);
    if (match?.[1]) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(match[1])}`;
    const id = url.searchParams.get('id');
    if (id) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  }
  if (host.endsWith('dropbox.com')) {
    url.searchParams.set('dl', '1');
  }
  return url.toString();
}

function parseAnnotation(raw: OcrResponse['document_annotation']): OcrAnnotation {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as OcrAnnotation;
  try {
    return JSON.parse(raw) as OcrAnnotation;
  } catch {
    return {};
  }
}

async function runMistralOcr(input: OcrInput, apiKey: string): Promise<{
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 75_000);
  try {
    const response = await fetch(MISTRAL_OCR_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document,
        include_blocks: true,
        confidence_scores_granularity: 'page',
        document_annotation_format: {
          type: 'json_schema',
          json_schema: {
            name: 'student_document',
            strict: true,
            schema: OCR_ANNOTATION_SCHEMA,
          },
        },
        document_annotation_prompt:
          'Extract the main handwritten or typed student response. If a student name or student number is visible, return it. Do not invent missing identity information. Preserve the response text faithfully.',
      }),
    });
    if (response.status === 429 || response.status === 503) throw new Error('mistral_temporarily_unavailable');
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`mistral_ocr_failed_${response.status}:${body.slice(0, 240)}`);
    }
    const payload = (await response.json()) as OcrResponse;
    const markdown = (payload.pages ?? []).map((page) => page.markdown ?? '').filter(Boolean).join('\n\n').trim();
    const annotation = parseAnnotation(payload.document_annotation);
    const text = (annotation.answerText || markdown).trim();
    const confidences = (payload.pages ?? [])
      .map((page) => page.confidence)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const confidence = confidences.length
      ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
      : undefined;
    return { text, markdown, payload, annotation, pageCount: payload.pages?.length ?? 0, confidence };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getIntegrationStatus(
  authHeader: string | undefined,
  deps: DocumentAssessmentDeps,
): Promise<{ mistral: boolean }> {
  const token = bearerToken(authHeader);
  if (!token || !(await requesterProfile(token, deps))) throw new Error('Unauthorized');
  const client = createRequesterClient(token, deps);
  const { data } = await client.rpc('integration_secret_status', { p_provider: 'mistral' });
  return { mistral: data === true };
}

export async function configureMistralKey(
  authHeader: string | undefined,
  apiKey: string,
  deps: DocumentAssessmentDeps,
): Promise<{ ok: true }> {
  const token = bearerToken(authHeader);
  if (!token) throw new Error('Unauthorized');
  const profile = await requesterProfile(token, deps);
  if (!profile || profile.role !== 'super_admin') throw new Error('Forbidden');
  const trimmed = apiKey.trim();
  if (trimmed.length < 16) throw new Error('invalid_mistral_key');
  if (!(await testMistralKey(trimmed))) throw new Error('mistral_key_rejected');

  const client = createRequesterClient(token, deps);
  const { error } = await client.rpc('admin_set_integration_secret', {
    p_provider: 'mistral',
    p_encrypted_value: encryptSecret(trimmed, deps),
  });
  if (error) throw new Error(`integration_save_failed:${error.message}`);
  return { ok: true };
}

export async function processDocumentOcr(
  authHeader: string | undefined,
  input: OcrInput,
  deps: DocumentAssessmentDeps,
): Promise<{ itemId: string; textLength: number; pageCount: number }> {
  const token = bearerToken(authHeader);
  if (!token) throw new Error('Unauthorized');
  const profile = await requesterProfile(token, deps);
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'super_admin')) throw new Error('Forbidden');

  const client = createRequesterClient(token, deps);
  const { data: item, error: itemError } = await client
    .from('document_import_items')
    .select('id, batch_id, original_filename')
    .eq('id', input.itemId)
    .maybeSingle();
  if (itemError || !item) throw new Error('document_item_not_found');

  await client.from('document_import_items').update({ ocr_status: 'processing', error_message: null }).eq('id', input.itemId);
  try {
    const apiKey = await loadMistralKey(token, deps);
    const result = await runMistralOcr(input, apiKey);
    if (!result.text) throw new Error('ocr_returned_empty_text');

    const { data: batch } = await client
      .from('document_import_batches')
      .select('kind, exam_id')
      .eq('id', item.batch_id)
      .maybeSingle();

    const { error: updateError } = await client
      .from('document_import_items')
      .update({
        ocr_text: result.text,
        ocr_markdown: result.markdown,
        ocr_payload: result.payload,
        suggested_student_name: result.annotation.studentName || null,
        suggested_student_identifier: result.annotation.studentIdentifier || null,
        confidence: result.confidence ?? null,
        page_count: result.pageCount,
        ocr_status: 'ready',
        review_status: 'needs_match',
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.itemId);
    if (updateError) throw new Error(`ocr_persist_failed:${updateError.message}`);

    if (batch?.kind === 'exam_template' && batch.exam_id) {
      await client
        .from('exam_definitions')
        .update({
          master_ocr_text: result.text,
          master_ocr_markdown: result.markdown,
          master_structure: result.payload,
          status: 'ready',
          updated_at: new Date().toISOString(),
        })
        .eq('id', batch.exam_id);
    }

    return { itemId: input.itemId, textLength: result.text.length, pageCount: result.pageCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ocr_failed';
    await client
      .from('document_import_items')
      .update({ ocr_status: 'failed', error_message: message.slice(0, 500), updated_at: new Date().toISOString() })
      .eq('id', input.itemId);
    throw error;
  }
}

function parseGeminiJson(raw: string): ExamModelResult {
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const parsed = JSON.parse(clean) as ExamModelResult;
  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) throw new Error('exam_grading_invalid_questions');
  if (!Number.isFinite(parsed.overallPercent)) throw new Error('exam_grading_invalid_score');
  return parsed;
}

async function gradeExamWithGemini(params: {
  blankText: string;
  studentText: string;
  examTitle: string;
  maxPoints: number;
  scoringNotes?: string | null;
  geminiApiKey: string;
}): Promise<ExamModelResult> {
  const prompt = `You are an expert teacher grading a scanned student exam using a blank exam template and the student's OCR transcript.

Important rules:
- The blank template defines the questions, instructions, answer areas, and any printed reference text. Printed text appearing in both documents is NOT a student answer.
- Infer question boundaries conservatively. Do not invent questions that are not present in the blank template.
- Grade only what can be supported by the student's OCR transcript.
- If OCR is ambiguous, lower confidence in the explanation instead of inventing an answer.
- Return question-level feedback explaining what is correct, what is wrong or missing, and what the expected answer/approach was.
- evidenceQuote, when present, must be copied verbatim from the STUDENT OCR text.
- Scores must be non-negative and must not exceed each question's maxPoints.
- The requested exam total is ${params.maxPoints} points. Your question maxPoints should sum approximately to that total; the server will normalize precisely.
${params.scoringNotes ? `Teacher scoring notes: ${params.scoringNotes}\n` : ''}

EXAM: ${params.examTitle}
--- BLANK EXAM OCR ---
${params.blankText}
--- END BLANK EXAM OCR ---

--- STUDENT FILLED EXAM OCR ---
${params.studentText}
--- END STUDENT FILLED EXAM OCR ---`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': params.geminiApiKey },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 6144,
          responseMimeType: 'application/json',
          responseSchema: EXAM_RESPONSE_SCHEMA,
        },
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`exam_grading_model_failed_${response.status}:${body.slice(0, 300)}`);
    }
    const json = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const raw = json.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
    if (!raw) throw new Error('exam_grading_model_empty');
    return parseGeminiJson(raw);
  } finally {
    clearTimeout(timeout);
  }
}

export async function gradeExamAttempt(
  authHeader: string | undefined,
  attemptId: string,
  deps: DocumentAssessmentDeps,
): Promise<{ attemptId: string; score: number }> {
  const token = bearerToken(authHeader);
  if (!token) throw new Error('Unauthorized');
  const profile = await requesterProfile(token, deps);
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'super_admin')) throw new Error('Forbidden');

  const client = createRequesterClient(token, deps);
  const { data: attempt, error: attemptError } = await client
    .from('exam_attempts')
    .select('id, exam_id, school_id, student_id, document_item_id, ocr_text, status')
    .eq('id', attemptId)
    .maybeSingle();
  if (attemptError || !attempt) throw new Error('exam_attempt_not_found');

  const { data: exam, error: examError } = await client
    .from('exam_definitions')
    .select('id, title, max_points, scoring_notes, master_ocr_text')
    .eq('id', attempt.exam_id)
    .maybeSingle();
  if (examError || !exam || !exam.master_ocr_text) throw new Error('exam_template_not_ready');
  if (!attempt.ocr_text?.trim()) throw new Error('exam_attempt_ocr_empty');

  await client.from('exam_attempts').update({ status: 'analyzing', updated_at: new Date().toISOString() }).eq('id', attemptId);
  try {
    const result = await gradeExamWithGemini({
      blankText: exam.master_ocr_text,
      studentText: attempt.ocr_text,
      examTitle: exam.title,
      maxPoints: Number(exam.max_points),
      scoringNotes: exam.scoring_notes,
      geminiApiKey: deps.geminiApiKey,
    });

    const rawMax = result.questions.reduce((sum, question) => sum + Math.max(0, Number(question.maxPoints) || 0), 0) || 1;
    const targetMax = Number(exam.max_points);
    const normalized = result.questions.map((question, index) => {
      const qMax = Math.max(0.01, Number(question.maxPoints) || 0.01);
      const maxScore = (qMax / rawMax) * targetMax;
      const boundedRawScore = Math.max(0, Math.min(qMax, Number(question.score) || 0));
      const score = (boundedRawScore / qMax) * maxScore;
      return {
        attempt_id: attemptId,
        question_key: question.key || `q_${index + 1}`,
        question_label: question.label || `Question ${index + 1}`,
        max_score: Number(maxScore.toFixed(2)),
        ai_score: Number(score.toFixed(2)),
        explanation: question.explanation || '',
        evidence_quote: question.evidenceQuote || null,
        feedback: question.feedback || null,
        sort_order: index,
      };
    });
    const finalScore = Number(normalized.reduce((sum, question) => sum + question.ai_score, 0).toFixed(2));

    await client.from('exam_question_scores').delete().eq('attempt_id', attemptId);
    const { error: insertError } = await client.from('exam_question_scores').insert(normalized);
    if (insertError) throw new Error(`exam_scores_persist_failed:${insertError.message}`);

    const { error: updateError } = await client
      .from('exam_attempts')
      .update({
        ai_score: finalScore,
        final_score: finalScore,
        ai_feedback: { summary: result.summary, rawOverallPercent: result.overallPercent },
        status: 'teacher_review_pending',
        feedback_visible: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', attemptId);
    if (updateError) throw new Error(`exam_attempt_persist_failed:${updateError.message}`);

    if (attempt.document_item_id) {
      await client.from('document_import_items').update({ review_status: 'teacher_review_pending' }).eq('id', attempt.document_item_id);
    }
    return { attemptId, score: finalScore };
  } catch (error) {
    await client.from('exam_attempts').update({ status: 'grading_failed', updated_at: new Date().toISOString() }).eq('id', attemptId);
    throw error;
  }
}
