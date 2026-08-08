import type express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z, ZodError } from 'zod';
import {
  configureMistralKey,
  getIntegrationStatus,
} from './documentAssessment.ts';
import { processDocumentOcrSecure } from './secureDocumentOcr.ts';
import { createAndGradeExamItemSecure, gradeExamAttemptSecure } from './secureExamGrading.ts';

interface RouteDeps {
  supabaseUrl: string;
  anonKey: string;
  gradingServerSecret: string;
  geminiApiKey: string;
  integrationEncryptionKey?: string;
}

const authenticatedKey = (req: express.Request) =>
  req.headers.authorization ?? ipKeyGenerator(req.ip ?? 'unknown');

const documentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authenticatedKey,
  message: { error: 'Too many document-processing requests. Please wait a few minutes and try again.' },
});

const integrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authenticatedKey,
  message: { error: 'Too many integration requests. Please wait a few minutes and try again.' },
});

const ocrSchema = z.object({
  itemId: z.string().uuid(),
  dataBase64: z.string().max(14_500_000).optional(),
  mimeType: z.string().max(100).optional(),
  sourceUrl: z.string().url().max(2_000).optional(),
}).refine((value) => Boolean(value.sourceUrl || (value.dataBase64 && value.mimeType)), {
  message: 'Either sourceUrl or dataBase64 + mimeType is required',
});

const mistralKeySchema = z.object({ apiKey: z.string().trim().min(16).max(500) });
const attemptIdSchema = z.string().uuid();
const gradeItemSchema = z.object({
  itemId: z.string().uuid(),
  examId: z.string().uuid(),
  studentId: z.string().uuid(),
});

function errorStatus(message: string): number {
  if (message === 'Unauthorized' || message.includes('not_authenticated')) return 401;
  if (
    message.includes('Forbidden')
    || message.includes('mismatch')
    || message.includes('teacher_required')
    || message.includes('owner_required')
    || message.includes('not_shared_with_teacher')
    || message.includes('not_taught_by_teacher')
  ) return 403;
  if (message.includes('not_found')) return 404;
  if (message.includes('not_configured') || message.includes('template_not_ready')) return 503;
  if (message.includes('temporarily_unavailable')) return 503;
  if (message.includes('timeout') || message.includes('network_failed')) return 503;
  if (message.includes('too_large')) return 413;
  if (message.includes('already_running') || message.includes('cannot_start') || message.includes('not_processing')) return 409;
  if (
    message.includes('unsupported')
    || message.includes('invalid')
    || message.includes('must_be_https')
    || message.includes('not_allowed')
    || message.includes('scale_too_small')
    || message.includes('mime_mismatch')
    || message.includes('not_ready')
  ) return 400;
  return 502;
}

export function registerDocumentAssessmentRoutes(app: express.Express, deps: RouteDeps): void {
  app.get('/api/integrations/status', integrationLimiter, async (req, res) => {
    try {
      res.json(await getIntegrationStatus(req.headers.authorization, deps));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'integration_status_failed';
      res.status(errorStatus(message)).json({ error: message });
    }
  });

  app.post('/api/admin/integrations/mistral', integrationLimiter, async (req, res) => {
    try {
      const body = mistralKeySchema.parse(req.body);
      res.json(await configureMistralKey(req.headers.authorization, body.apiKey, deps));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Invalid request body', details: error.issues });
        return;
      }
      const message = error instanceof Error ? error.message : 'integration_config_failed';
      res.status(errorStatus(message)).json({ error: message });
    }
  });

  app.post('/api/documents/ocr', documentLimiter, async (req, res) => {
    try {
      const body = ocrSchema.parse(req.body);
      res.json(await processDocumentOcrSecure(req.headers.authorization, body, deps));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Invalid request body', details: error.issues });
        return;
      }
      const message = error instanceof Error ? error.message : 'ocr_failed';
      console.error('[ocr] request failed:', message);
      res.status(errorStatus(message)).json({ error: message });
    }
  });

  app.post('/api/exam-items/grade', documentLimiter, async (req, res) => {
    try {
      const body = gradeItemSchema.parse(req.body);
      res.json(await createAndGradeExamItemSecure(
        req.headers.authorization,
        body.itemId,
        body.examId,
        body.studentId,
        deps,
      ));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Invalid exam grading request' });
        return;
      }
      const message = error instanceof Error ? error.message : 'exam_grading_failed';
      console.error('[exam-item-grading] request failed:', message);
      res.status(errorStatus(message)).json({ error: message });
    }
  });

  app.post('/api/exam-attempts/:attemptId/grade', documentLimiter, async (req, res) => {
    try {
      const attemptId = attemptIdSchema.parse(req.params.attemptId);
      res.json(await gradeExamAttemptSecure(req.headers.authorization, attemptId, deps));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Invalid attempt ID' });
        return;
      }
      const message = error instanceof Error ? error.message : 'exam_grading_failed';
      console.error('[exam-grading] request failed:', message);
      res.status(errorStatus(message)).json({ error: message });
    }
  });
}
