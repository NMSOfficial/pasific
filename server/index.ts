import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z, ZodError } from 'zod';
import { requestPasswordReset } from './passwordReset.ts';
import { deleteUserAccount } from './adminActions.ts';
import { gradeAndPersistSubmission, SubmissionGradingError } from './submissionGrading.ts';

try {
  process.loadEnvFile();
} catch {
  // Railway/Vercel provide runtime variables; a local .env is optional.
}

const PORT = Number(process.env.PORT ?? 8787);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const APP_ORIGIN = process.env.APP_ORIGIN;
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN ?? '').split(',').map((value) => value.trim()).filter(Boolean);

// DIAGNOSTIC: Key metadata (no secrets printed)
if (SUPABASE_SERVICE_ROLE_KEY) {
  const trimmed = SUPABASE_SERVICE_ROLE_KEY.trim();
  const hasLeadingSpace = SUPABASE_SERVICE_ROLE_KEY !== trimmed;
  const hasQuotes = SUPABASE_SERVICE_ROLE_KEY.startsWith('"') || SUPABASE_SERVICE_ROLE_KEY.startsWith("'");
  const dotCount = trimmed.split('.').length - 1;
  let keyFamily = 'unknown';
  let jwtPayload: any = null;
  
  if (trimmed.startsWith('eyJ')) {
    keyFamily = 'legacy_jwt';
    try {
      const parts = trimmed.split('.');
      if (parts.length === 3) {
        jwtPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      }
    } catch {}
  } else if (trimmed.startsWith('sb_secret_')) {
    keyFamily = 'sb_secret';
  } else if (trimmed.startsWith('sb_publishable_')) {
    keyFamily = 'sb_publishable';
  }
  
  console.log(`[diagnostic] SUPABASE_SERVICE_ROLE_KEY metadata:`);
  console.log(`  - Length (trimmed): ${trimmed.length}`);
  console.log(`  - Family: ${keyFamily}`);
  console.log(`  - Dot count: ${dotCount}`);
  console.log(`  - Has leading/trailing space: ${hasLeadingSpace}`);
  console.log(`  - Wrapped in quotes: ${hasQuotes}`);
  if (jwtPayload) {
    console.log(`  - JWT role: ${jwtPayload.role || 'N/A'}`);
    console.log(`  - JWT project_ref: ${jwtPayload.sub || 'N/A'}`);
  }
  console.log(`  - Configured SUPABASE_URL: ${SUPABASE_URL}`);
  
  // Test REST API access with the (possibly trimmed/unquoted) key
  (async () => {
    try {
      const testKey = hasQuotes ? trimmed.slice(1, -1) : trimmed;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: { apikey: testKey },
      });
      console.log(`  - REST API health check status: ${res.status}`);
    } catch (err) {
      console.log(`  - REST API health check failed: ${(err as Error).message}`);
    }
  })();
}

if (!GEMINI_API_KEY) console.warn('[server] GEMINI_API_KEY is not configured');
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) console.warn('[server] Supabase public configuration is incomplete');
if (!SUPABASE_SERVICE_ROLE_KEY) console.warn('[server] SUPABASE_SERVICE_ROLE_KEY is not configured');
if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) console.warn('[server] Resend configuration is incomplete');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  req.url = req.url.replace(/\/{2,}/g, '/');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

const authenticatedKey = (req: express.Request) =>
  req.headers.authorization ?? ipKeyGenerator(req.ip ?? 'unknown');

const gradeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authenticatedKey,
  message: { error: 'Too many grading requests. Please wait a few minutes and try again.' },
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please wait a few minutes and try again.' },
});

const adminActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authenticatedKey,
  message: { error: 'Too many admin actions. Please wait a few minutes and try again.' },
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get('/health', (_req, res) => {
  const configured = Boolean(GEMINI_API_KEY && SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);
  res.status(configured ? 200 : 503).json({ status: configured ? 'ok' : 'degraded' });
});

interface RequesterProfile {
  role?: string;
  status?: string;
  expires_at?: string | null;
}

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

    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role,status,expires_at`,
      { headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY } },
    );
    if (!profileRes.ok) return null;
    const rows = (await profileRes.json()) as RequesterProfile[];
    const profile = rows[0];
    if (!profile || profile.status !== 'active') return null;
    if (profile.expires_at && new Date(profile.expires_at).getTime() <= Date.now()) return null;
    return profile.role ?? null;
  } catch {
    return null;
  }
}

const submissionIdSchema = z.string().uuid();

app.post('/api/submissions/:submissionId/grade', gradeLimiter, async (req, res) => {
  if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ error: 'Grading is not configured on the server' });
    return;
  }

  const parsedId = submissionIdSchema.safeParse(req.params.submissionId);
  if (!parsedId.success) {
    res.status(400).json({ error: 'Invalid submission ID' });
    return;
  }

  try {
    const result = await gradeAndPersistSubmission(parsedId.data, req.headers.authorization, {
      supabaseUrl: SUPABASE_URL,
      serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
      geminiApiKey: GEMINI_API_KEY,
    });
    res.json(result);
  } catch (error) {
    if (error instanceof SubmissionGradingError) {
      console.error('[grading] request failed:', error.message);
      res.status(error.status).json({ error: error.message, retryable: error.retryable });
      return;
    }
    throw error;
  }
});

const passwordResetRequestSchema = z.object({
  username: z.string().trim().min(1).max(100),
  method: z.enum(['email', 'phone']),
});

app.post('/api/auth/request-password-reset', passwordResetLimiter, async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ error: 'Password reset is not configured on the server' });
    return;
  }

  let body;
  try {
    body = passwordResetRequestSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid request body', details: error.issues });
      return;
    }
    throw error;
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
  } catch (error) {
    console.error('[password-reset] unexpected error:', error);
    res.json({ result: 'sent' });
  }
});

const deleteUserRequestSchema = z.object({ userId: z.string().uuid() });

app.post('/api/admin/delete-user', adminActionLimiter, async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ error: 'Not configured on the server' });
    return;
  }

  if ((await getRequesterRole(req.headers.authorization)) !== 'super_admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  let body;
  try {
    body = deleteUserRequestSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid request body', details: error.issues });
      return;
    }
    throw error;
  }

  try {
    await deleteUserAccount(body.userId, {
      supabaseUrl: SUPABASE_URL,
      serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('[admin] failed to delete user:', error);
    res.status(502).json({ error: 'Failed to delete account' });
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] unhandled error:', error);
  if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

