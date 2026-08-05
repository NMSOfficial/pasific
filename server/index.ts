import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z, ZodError } from 'zod';
import { gradeRequestSchema } from './gradingSchema.ts';
import { gradeSubmission, GradingError } from './gemini.ts';
import { requestPasswordReset } from './passwordReset.ts';
import { deleteUserAccount } from './adminActions.ts';

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
// Defends against a trailing slash on the client's API base URL (e.g.
// VITE_API_URL="https://host.app/") producing "https://host.app//api/grade" —
// Express's exact path matching wouldn't otherwise match that against
// "/api/grade" and every request would silently 404.
app.use((req, _res, next) => {
  req.url = req.url.replace(/\/{2,}/g, '/');
  next();
});

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

// Destructive and admin-only, but still bound this — a compromised admin
// token shouldn't be able to script deleting the whole user base in one go.
const adminActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers.authorization ?? ipKeyGenerator(req.ip ?? 'unknown'),
  message: { error: 'Too many admin actions. Please wait a few minutes and try again.' },
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

// Same session-token check as isAuthorized(), plus a lookup of the caller's
// own profile row (readable under RLS via "profile self or same-school
// staff") to confirm they're actually super_admin before letting them
// delete someone else's account.
async function getRequesterRole(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ') || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const token = authHeader.slice('Bearer '.length);
  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    });
    if (!userRes.ok) return null;
    const user = (await userRes.json()) as { id?: string };
    if (!user.id) return null;

    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    });
    if (!profileRes.ok) return null;
    const rows = (await profileRes.json()) as { role?: string }[];
    return rows[0]?.role ?? null;
  } catch {
    return null;
  }
}

// Gives the grader the platform's actual written definition of the target
// level instead of just a bare "B1"/"C1" label, so scoring is anchored to
// a concrete standard rather than the model's own (possibly inconsistent)
// notion of what a level means. Best-effort: grading still proceeds
// without it (falling back to the bare level) if the fetch fails.
async function fetchLevelDescriptor(level: string, authHeader: string | undefined): Promise<string | undefined> {
  if (!authHeader?.startsWith('Bearer ') || !SUPABASE_URL || !SUPABASE_ANON_KEY) return undefined;
  const token = authHeader.slice('Bearer '.length);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cefr_level_descriptors?level=eq.${encodeURIComponent(level)}&select=descriptor`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    });
    if (!res.ok) return undefined;
    const rows = (await res.json()) as { descriptor?: string }[];
    return rows[0]?.descriptor || undefined;
  } catch {
    return undefined;
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
    const levelDescriptor = await fetchLevelDescriptor(body.level, req.headers.authorization);
    const result = await gradeSubmission(body, API_KEY, levelDescriptor);
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

const deleteUserRequestSchema = z.object({
  userId: z.string().uuid(),
});

// Hard-deletes a teacher/student account (auth.users row + everything that
// cascades from it — see adminActions.ts for why this can't be a plain
// client-side table delete). super_admin only.
app.post('/api/admin/delete-user', adminActionLimiter, async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: 'Not configured on the server' });
    return;
  }

  const role = await getRequesterRole(req.headers.authorization);
  if (role !== 'super_admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  let body;
  try {
    body = deleteUserRequestSchema.parse(req.body);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Invalid request body', details: err.issues });
      return;
    }
    throw err;
  }

  try {
    await deleteUserAccount(body.userId, { supabaseUrl: SUPABASE_URL, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY });
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin] failed to delete user:', err);
    res.status(502).json({ error: 'Failed to delete account' });
  }
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
