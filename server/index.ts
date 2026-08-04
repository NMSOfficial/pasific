import express from 'express';
import { ZodError } from 'zod';
import { gradeRequestSchema } from './gradingSchema.ts';
import { gradeSubmission, GradingError } from './gemini.ts';

try {
  process.loadEnvFile();
} catch {
  // .env not present yet — fall through to the GEMINI_API_KEY warning below.
}

const PORT = Number(process.env.PORT ?? 8787);
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn('[server] GEMINI_API_KEY is not set — /api/grade will fail until it is configured in .env');
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.post('/api/grade', async (req, res) => {
  if (!API_KEY) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    return;
  }

  let body;
  try {
    body = gradeRequestSchema.parse(req.body);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Invalid request body', details: err.issues });
      return;
    }
    throw err;
  }

  try {
    const result = await gradeSubmission(body, API_KEY);
    res.json(result);
  } catch (err) {
    if (err instanceof GradingError) {
      console.error('[grading] failed:', err.message);
      res.status(err.retryable ? 503 : 502).json({ error: err.message });
      return;
    }
    console.error('[grading] unexpected error:', err);
    res.status(502).json({ error: 'Grading failed unexpectedly' });
  }
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
