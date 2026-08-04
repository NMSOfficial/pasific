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
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean);

if (!API_KEY) {
  console.warn('[server] GEMINI_API_KEY is not set — /api/grade will fail until it is configured in .env');
}
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[server] SUPABASE_URL/SUPABASE_ANON_KEY not set — /api/grade will reject all requests until configured');
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Requires a logged-in Pasific user's Supabase session token, so this
// (publicly reachable, cost-incurring) endpoint can't be hit anonymously.
async function isAuthorized(authHeader: string | undefined): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ') || !SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  const token = authHeader.slice('Bearer '.length);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    });
    return res.ok;
  } catch {
    return false;
  }
}

app.post('/api/grade', async (req, res) => {
  if (!API_KEY) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    return;
  }
  if (!(await isAuthorized(req.headers.authorization))) {
    res.status(401).json({ error: 'Unauthorized' });
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
