import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z, ZodError } from 'zod';
import { gradeRequestSchema } from './gradingSchema.ts';
import { gradeSubmission, GradingError } from './gemini.ts';
import { requestPasswordReset } from './passwordReset.ts';

try {
  process.loadEnvFile();
} catch {
  // .env not present yet — fall through to the GEMINI_API_KEY warning below.
}

const PORT = Number(process.env.PORT ?? 8787);
const API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const APP_ORIGIN = process.env.APP_ORIGIN;
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean);

if (!API_KEY) {
  console.warn('[server] GEMINI_API_KEY is not set — /api/grade will fail until it is configured in .env');
}
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[server] SUPABASE_URL/SUPABASE_ANON_KEY not set — /api/grade will reject all requests until configured');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[server] SUPABASE_SERVICE_ROLE_KEY is not set — /api/auth/request-password-reset will reject all requests until configured');
}
if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
  console.warn('[server] RESEND_API_KEY/RESEND_FROM_EMAIL not set — password reset links will be generated but not emailed until configured');
}

const app = express();
// Railway/Vercel sit in front of this server as a reverse proxy; without this,
// every request would appear to come from the proxy's IP, making per-IP rate
// limiting useless (it would count all users as one).
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

// Grading calls out to the paid Gemini API, so this limits both abuse and
// runaway cost. Keyed by the caller's bearer token (stable per logged-in
// session) rather than IP, since many students can share a school network.
const gradeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers.authorization ?? ipKeyGenerator(req.ip ?? 'unknown'),
  message: { error: 'Too many grading requests. Please wait a few minutes and try again.' },
});

// Unauthenticated by design (the user isn't logged in yet), so this is
// rate-limited tightly per IP to prevent it being used to spam an inbox or
// enumerate usernames.
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please wait a few minutes and try again.' },
});

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

app.post('/api/grade', gradeLimiter, async (req, res) => {
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

const passwordResetRequestSchema = z.object({
  username: z.string().min(1),
  method: z.enum(['email', 'phone']),
});

app.post('/api/auth/request-password-reset', passwordResetLimiter, async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: 'Password reset is not configured on the server' });
    return;
  }

  let body;
  try {
    body = passwordResetRequestSchema.parse(req.body);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Invalid request body', details: err.issues });
      return;
    }
    throw err;
  }

  try {
    const result = await requestPasswordReset(body.username, body.method, {
      supabaseUrl: SUPABASE_URL,
      serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
      resendApiKey: RESEND_API_KEY,
      resendFromEmail: RESEND_FROM_EMAIL,
      appOrigin: APP_ORIGIN,
    });
    res.json({ result });
  } catch (err) {
    console.error('[password-reset] unexpected error:', err);
    // Still don't leak failure details to an unauthenticated caller.
    res.json({ result: 'sent' });
  }
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
