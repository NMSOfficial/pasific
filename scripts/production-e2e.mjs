import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const required = [
  'APP_ORIGIN', 'VERCEL_SHARE_URL', 'TEST_PASSWORD',
  'ADMIN_USERNAME', 'TEACHER_USERNAME',
  'STUDENT_CODE', 'STUDENT_USERNAME',
  'OUTSIDER_CODE', 'OUTSIDER_USERNAME',
  'SUPABASE_URL', 'API_URL',
];

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

const APP_ORIGIN = process.env.APP_ORIGIN.replace(/\/$/, '');
const SHARE_URL = process.env.VERCEL_SHARE_URL;
const PASSWORD = process.env.TEST_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/$/, '');
const API_URL = process.env.API_URL.replace(/\/$/, '');
const OUTPUT_DIR = path.resolve('test-results/production-e2e');
const assignmentTitle = 'E2E Essay 260806';
const feedbackText = 'E2E teacher feedback: clear structure, relevant support, and actionable next steps.';

const report = {
  startedAt: new Date().toISOString(),
  appOrigin: APP_ORIGIN,
  steps: [],
  browserErrors: [],
  assertions: [],
};

await fs.mkdir(OUTPUT_DIR, { recursive: true });

function log(message) {
  console.log(`[production-e2e] ${message}`);
}

function assert(condition, message, details) {
  report.assertions.push({ ok: Boolean(condition), message, details });
  if (!condition) {
    const suffix = details === undefined ? '' : `\n${JSON.stringify(details, null, 2)}`;
    throw new Error(`${message}${suffix}`);
  }
}

async function step(name, fn, page) {
  const startedAt = Date.now();
  log(`START ${name}`);
  try {
    const value = await fn();
    report.steps.push({ name, ok: true, durationMs: Date.now() - startedAt });
    log(`PASS  ${name}`);
    return value;
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    report.steps.push({ name, ok: false, durationMs: Date.now() - startedAt, error: message });
    log(`FAIL  ${name}: ${message}`);
    if (page) {
      await page.screenshot({ path: path.join(OUTPUT_DIR, `${slug(name)}.png`), fullPage: true }).catch(() => {});
      await fs.writeFile(path.join(OUTPUT_DIR, `${slug(name)}.html`), await page.content().catch(() => ''), 'utf8').catch(() => {});
    }
    throw error;
  }
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
}

function decodeJwtSubject(token) {
  const encoded = token.split('.')[1];
  if (!encoded) throw new Error('Invalid JWT');
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
  if (!payload.sub) throw new Error('JWT has no subject');
  return payload.sub;
}

async function poll(label, fn, predicate, timeoutMs = 180_000, intervalMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  let latest;
  while (Date.now() < deadline) {
    latest = await fn();
    if (predicate(latest)) return latest;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`${label} timed out. Last value: ${JSON.stringify(latest)}`);
}

function monitorPage(page, label) {
  page.on('pageerror', (error) => {
    report.browserErrors.push({ label, type: 'pageerror', message: error.message });
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      report.browserErrors.push({ label, type: 'console.error', message: message.text() });
    }
  });
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText ?? 'unknown';
    if (reason.includes('ERR_ABORTED')) return;
    report.browserErrors.push({ label, type: 'requestfailed', url: request.url(), message: reason });
  });
  page.on('response', (response) => {
    if (response.status() >= 500) {
      report.browserErrors.push({ label, type: 'http-5xx', url: response.url(), status: response.status() });
    }
  });
}

async function createSession(browser, label) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  });
  const capture = { apikey: null };
  context.on('request', (request) => {
    if (!request.url().includes('.supabase.co')) return;
    const headers = request.headers();
    if (headers.apikey) capture.apikey = headers.apikey;
  });
  const page = await context.newPage();
  monitorPage(page, label);
  await page.goto(SHARE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('#root', { timeout: 30_000 });
  return { label, context, page, capture };
}

async function goto(session, pathname) {
  await session.page.goto(`${APP_ORIGIN}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await session.page.waitForSelector('#root', { timeout: 30_000 });
}

async function login(session, username, expectedPath) {
  await goto(session, '/login');
  await session.page.locator('#login-username').fill(username);
  await session.page.locator('#login-password').fill(PASSWORD);
  await Promise.all([
    session.page.waitForURL((url) => url.pathname.startsWith(expectedPath), { timeout: 30_000 }),
    session.page.locator('form button[type="submit"]').click(),
  ]);
  await session.page.waitForLoadState('networkidle').catch(() => {});
}

async function activate(session, code, username, expectedPath) {
  await goto(session, '/activate');
  await session.page.locator('#activation-code').fill(code);
  await session.page.locator('form button[type="submit"]').click();
  await session.page.locator('#new-username').waitFor({ timeout: 30_000 });
  await session.page.locator('#new-username').fill(username);
  await session.page.locator('#new-password').fill(PASSWORD);
  await session.page.locator('#confirm-password').fill(PASSWORD);
  await session.page.locator('form input[type="checkbox"]').check();
  await session.page.locator('form button[type="submit"]').click();
  await session.page.waitForURL((url) => url.pathname.startsWith(expectedPath), { timeout: 45_000 });
  await session.page.waitForLoadState('networkidle').catch(() => {});
}

async function getToken(session) {
  return session.page.evaluate(() => {
    const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('sb-') && candidate.endsWith('-auth-token'));
    if (!key) throw new Error('Supabase auth storage key was not found');
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error('Supabase auth storage is empty');
    const parsed = JSON.parse(raw);
    const token = parsed?.access_token ?? parsed?.currentSession?.access_token;
    if (!token) throw new Error('Supabase access token was not found');
    return token;
  });
}

async function rest(session, resource, options = {}) {
  const token = await getToken(session);
  const apikey = await poll('Supabase API key capture', async () => session.capture.apikey, Boolean, 20_000, 250);
  const headers = {
    apikey,
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.prefer ? { Prefer: options.prefer } : {}),
  };
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${resource}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  return { status: response.status, ok: response.ok, body, headers: Object.fromEntries(response.headers) };
}

async function ownProfile(session) {
  const token = await getToken(session);
  const userId = decodeJwtSubject(token);
  const response = await rest(session, `profiles?id=eq.${encodeURIComponent(userId)}&select=id,role,username,school_id,status`);
  assert(response.ok && Array.isArray(response.body) && response.body.length === 1, 'Current profile must be readable', response);
  return response.body[0];
}

async function verifyHealth() {
  const response = await fetch(`${API_URL}/health`);
  const body = await response.text();
  assert(response.ok, 'Railway health endpoint must return success', { status: response.status, body });
}

const browser = await chromium.launch({ headless: true });
const sessions = [];
let admin;
let teacher;
let student;
let outsider;
let assignmentId;
let assignmentRow;
let submissionId;
let outsiderId;

try {
  await step('Railway health check', verifyHealth);

  admin = await createSession(browser, 'admin');
  sessions.push(admin);
  await step('Admin login', () => login(admin, process.env.ADMIN_USERNAME, '/admin/dashboard'), admin.page);

  await step('Admin school management', async () => {
    await goto(admin, '/admin/schools');
    await admin.page.getByText('E2E Pasific A 260806', { exact: true }).first().waitFor({ timeout: 30_000 });
    await admin.page.getByText('E2E Pasific B 260806', { exact: true }).first().waitFor({ timeout: 30_000 });
    await admin.page.locator('button.btn--primary').first().click();
    await admin.page.locator('#school-name').fill('E2E UI School 260806');
    await admin.page.locator('#school-city').fill('UI Test City');
    await admin.page.locator('#school-name').locator('xpath=ancestor::div[contains(@class,"card")]').locator('button.btn--primary').click();
    await admin.page.getByText('E2E UI School 260806', { exact: true }).first().waitFor({ timeout: 30_000 });
  }, admin.page);

  await step('Admin user and permission management', async () => {
    await goto(admin, '/admin/teachers');
    const card = admin.page.locator('.card').filter({ hasText: `@${process.env.TEACHER_USERNAME}` }).first();
    await card.waitFor({ timeout: 30_000 });
    await card.locator('button.btn--secondary').click();
    await card.locator('button.btn--primary').click();
  }, admin.page);

  await step('Admin role route guard', async () => {
    await goto(admin, '/teacher/dashboard');
    await admin.page.waitForURL((url) => url.pathname === '/admin/dashboard', { timeout: 20_000 });
  }, admin.page);

  teacher = await createSession(browser, 'teacher');
  sessions.push(teacher);
  await step('Teacher login', () => login(teacher, process.env.TEACHER_USERNAME, '/teacher/dashboard'), teacher.page);

  await step('Teacher class creation', async () => {
    await goto(teacher, '/teacher/classes');
    await teacher.page.getByText('E2E 10-A 260806', { exact: true }).first().waitFor({ timeout: 30_000 });
    await teacher.page.locator('button.btn--primary').first().click();
    await teacher.page.locator('#new-class-name').fill('E2E UI Class 260806');
    await teacher.page.locator('#new-class-grade').fill('11. Sınıf');
    await teacher.page.locator('#new-class-name').locator('xpath=ancestor::div[contains(@class,"card")]').locator('button.btn--primary').click();
    await teacher.page.getByText('E2E UI Class 260806', { exact: true }).first().waitFor({ timeout: 30_000 });
  }, teacher.page);

  await step('Teacher assignment and custom rubric creation', async () => {
    await goto(teacher, '/teacher/assignments/new');
    await teacher.page.locator('button.btn--secondary.btn--sm').first().click();
    await teacher.page.locator('#nt-title').fill(assignmentTitle);
    await teacher.page.locator('#nt-prompt').fill('Write an opinion essay about whether schools should dedicate one lesson each week to practical life skills.');
    await teacher.page.locator('#nt-level').selectOption('B2');
    await teacher.page.locator('#nt-title').locator('xpath=ancestor::div[contains(@class,"card")]').locator('button.btn--primary').click();

    await teacher.page.locator('#ab-title').waitFor({ timeout: 30_000 });
    await teacher.page.locator('#ab-due-at').fill('2026-08-10T12:00');
    await teacher.page.getByLabel('E2E 10-A 260806', { exact: true }).check();
    await teacher.page.getByRole('button', { name: 'İleri', exact: true }).click();
    await teacher.page.getByRole('button', { name: 'İleri', exact: true }).click();

    const weights = teacher.page.locator('input[id^="weight-"]');
    await weights.first().fill('15');
    await teacher.page.locator('button.btn--secondary.btn--sm').first().click();
    await teacher.page.locator('input[id^="criterion-name-custom_"]').fill('E2E Clarity');
    await teacher.page.locator('input[id^="weight-custom_"]').fill('5');
    await teacher.page.getByText('100%', { exact: true }).waitFor({ timeout: 10_000 });
    await teacher.page.getByRole('button', { name: 'İleri', exact: true }).click();
    await teacher.page.locator('button.btn--primary').last().click();
    await teacher.page.waitForURL((url) => url.pathname === '/teacher/assignments', { timeout: 45_000 });

    const titleLink = teacher.page.getByRole('link', { name: assignmentTitle, exact: true }).first();
    await titleLink.waitFor({ timeout: 30_000 });
    const href = await titleLink.getAttribute('href');
    const match = href?.match(/\/teacher\/assignments\/([^/?#]+)/);
    assert(match?.[1], 'Published assignment ID must be discoverable', { href });
    assignmentId = match[1];

    const assignmentResponse = await rest(teacher, `assignments?id=eq.${encodeURIComponent(assignmentId)}&select=*`);
    assert(assignmentResponse.ok && assignmentResponse.body?.length === 1, 'Teacher must read the published assignment', assignmentResponse);
    assignmentRow = assignmentResponse.body[0];
    assert(assignmentRow.status === 'published', 'Assignment must be published', assignmentRow);

    const criteriaResponse = await rest(teacher, `rubric_criteria?rubric_id=eq.${encodeURIComponent(assignmentRow.rubric_id)}&select=key,name_key,weight,max_score,enabled`);
    assert(criteriaResponse.ok && criteriaResponse.body.length >= 6, 'Custom rubric must persist all criteria', criteriaResponse);
    assert(criteriaResponse.body.some((row) => row.name_key === 'E2E Clarity' && Number(row.weight) === 5), 'Custom criterion must persist with expected weight', criteriaResponse.body);
  }, teacher.page);

  await step('Teacher role route guard', async () => {
    await goto(teacher, '/admin/dashboard');
    await teacher.page.waitForURL((url) => url.pathname === '/teacher/dashboard', { timeout: 20_000 });
  }, teacher.page);

  student = await createSession(browser, 'student');
  sessions.push(student);
  await step('Student activation and login session', () => activate(student, process.env.STUDENT_CODE, process.env.STUDENT_USERNAME, '/student/home'), student.page);

  await step('Student opens and submits assignment', async () => {
    await goto(student, '/student/assignments');
    await student.page.getByRole('link', { name: assignmentTitle, exact: true }).first().waitFor({ timeout: 30_000 });
    await goto(student, `/student/assignments/${assignmentId}/write`);
    await student.page.locator('#writing-textarea').waitFor({ timeout: 30_000 });
    const essay = `Schools should dedicate one lesson each week to practical life skills because academic knowledge alone does not prepare students for every responsibility they will face. A regular lesson could teach budgeting, basic first aid, digital safety, communication, and simple household tasks. These topics are useful immediately, but they also help young people become more independent and confident.\n\nSome people argue that the timetable is already crowded and that families should teach these skills. However, not every student has the same opportunities at home. A school lesson would give everyone access to reliable information and guided practice. It would also allow teachers to connect life skills with mathematics, science, language, and citizenship. For example, students could compare mobile phone contracts, plan a healthy weekly menu, write a formal complaint, or practise responding calmly in an emergency.\n\nThe lesson should not replace core subjects. Instead, it could use one flexible period and include short projects assessed through participation rather than stressful examinations. Local professionals and community organisations could occasionally contribute. In my view, one practical lesson per week would make education more relevant, fair, and connected to adult life. Students would leave school not only with certificates, but also with the confidence to make informed everyday decisions.`;
    await student.page.locator('#writing-textarea').fill(essay);
    await student.page.locator('button.btn--primary.btn--lg').click();
    const dialog = student.page.getByRole('alertdialog');
    await dialog.waitFor({ timeout: 10_000 });
    await dialog.locator('button.btn--primary').click();
    await student.page.getByRole('heading', { name: /gönder/i }).waitFor({ timeout: 30_000 });
  }, student.page);

  const studentProfile = await step('Student profile and grading persistence', async () => {
    const profile = await ownProfile(student);
    const response = await poll(
      'AI grading',
      () => rest(student, `submissions?assignment_id=eq.${encodeURIComponent(assignmentId)}&student_id=eq.${encodeURIComponent(profile.id)}&select=*`),
      (value) => value.ok && Array.isArray(value.body) && value.body.length === 1 && ['teacher_review_pending', 'result_ready', 'grading_failed'].includes(value.body[0].status),
      180_000,
      3_000,
    );
    const submission = response.body[0];
    assert(submission.status !== 'grading_failed', 'AI grading must not fail', submission);
    assert(submission.ai_score !== null, 'AI score must be persisted', submission);
    submissionId = submission.id;

    const scores = await rest(student, `criterion_scores?submission_id=eq.${encodeURIComponent(submissionId)}&select=*`);
    assert(scores.ok && scores.body.length >= 6, 'AI criterion scores must be persisted', scores);
    return profile;
  }, student.page);

  await step('Student protected-field tampering is blocked', async () => {
    const roleAttempt = await rest(student, `profiles?id=eq.${encodeURIComponent(studentProfile.id)}`, {
      method: 'PATCH', body: { role: 'super_admin' }, prefer: 'return=representation',
    });
    assert(!roleAttempt.ok, 'Student role escalation attempt must fail', roleAttempt);
    const unchanged = await ownProfile(student);
    assert(unchanged.role === 'student', 'Student role must remain unchanged after attack', unchanged);

    const gradingAttempt = await rest(student, `submissions?id=eq.${encodeURIComponent(submissionId)}`, {
      method: 'PATCH',
      body: { ai_score: 99, final_score: 99, teacher_feedback: 'tampered' },
      prefer: 'return=representation',
    });
    assert(!gradingAttempt.ok, 'Student grading-field tampering must fail', gradingAttempt);
  }, student.page);

  await step('Student role route guard', async () => {
    await goto(student, '/teacher/dashboard');
    await student.page.waitForURL((url) => url.pathname === '/student/home', { timeout: 20_000 });
  }, student.page);

  outsider = await createSession(browser, 'outsider');
  sessions.push(outsider);
  await step('Second-school student activation', () => activate(outsider, process.env.OUTSIDER_CODE, process.env.OUTSIDER_USERNAME, '/student/home'), outsider.page);

  const outsiderProfile = await step('Cross-school RLS isolation', async () => {
    const profile = await ownProfile(outsider);
    outsiderId = profile.id;

    const assignmentRead = await rest(outsider, `assignments?id=eq.${encodeURIComponent(assignmentId)}&select=id,school_id`);
    assert(assignmentRead.ok && Array.isArray(assignmentRead.body) && assignmentRead.body.length === 0, 'Other-school student must not read assignment', assignmentRead);

    const submissionRead = await rest(outsider, `submissions?id=eq.${encodeURIComponent(submissionId)}&select=id,student_id,school_id`);
    assert(submissionRead.ok && Array.isArray(submissionRead.body) && submissionRead.body.length === 0, 'Other-school student must not read submission', submissionRead);

    const forgedInsert = await rest(outsider, 'submissions', {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        assignment_id: assignmentId,
        is_practice: false,
        student_id: profile.id,
        school_id: assignmentRow.school_id,
        writing_type_id: assignmentRow.writing_type_id,
        level: assignmentRow.level,
        topic_title: assignmentRow.title,
        text: 'forged cross-school submission',
        word_count: 3,
        status: 'in_progress',
        score_visible_to_student: false,
        uses_custom_rubric: false,
      },
    });
    assert(!forgedInsert.ok, 'Other-school student must not create a forged submission', forgedInsert);

    const roleAttempt = await rest(outsider, `profiles?id=eq.${encodeURIComponent(profile.id)}`, {
      method: 'PATCH', body: { role: 'super_admin' }, prefer: 'return=representation',
    });
    assert(!roleAttempt.ok, 'Other-school student role escalation must fail', roleAttempt);
    return profile;
  }, outsider.page);

  await step('Teacher cannot read other-school student', async () => {
    const response = await rest(teacher, `profiles?id=eq.${encodeURIComponent(outsiderProfile.id)}&select=id,role,school_id`);
    assert(response.ok && Array.isArray(response.body) && response.body.length === 0, 'Teacher must not read another school student profile', response);
  }, teacher.page);

  await step('Teacher reviews and publishes feedback', async () => {
    await goto(teacher, `/teacher/submissions/${submissionId}`);
    await teacher.page.locator('#teacher-feedback').waitFor({ timeout: 60_000 });
    await teacher.page.locator('#teacher-feedback').fill(feedbackText);
    const section = teacher.page.locator('#teacher-feedback').locator('xpath=ancestor::section');
    await section.locator('button.btn--primary').click();

    const response = await poll(
      'Teacher review publication',
      () => rest(teacher, `submissions?id=eq.${encodeURIComponent(submissionId)}&select=status,score_visible_to_student,teacher_feedback,final_score`),
      (value) => value.ok && value.body?.[0]?.status === 'result_ready' && value.body[0].score_visible_to_student === true,
      60_000,
      1_000,
    );
    assert(response.body[0].teacher_feedback === feedbackText, 'Teacher feedback must persist exactly', response.body[0]);
    assert(response.body[0].final_score !== null, 'Final score must be available after teacher review', response.body[0]);
  }, teacher.page);

  await step('Student sees final score and teacher feedback', async () => {
    await goto(student, `/student/submissions/${submissionId}/result`);
    await student.page.getByRole('heading', { name: assignmentTitle, exact: true }).waitFor({ timeout: 45_000 });
    await student.page.getByText(feedbackText, { exact: true }).waitFor({ timeout: 30_000 });
    await student.page.locator('.score-ring').waitFor({ timeout: 30_000 });
  }, student.page);

  await step('Admin sees activated students', async () => {
    await goto(admin, '/admin/students');
    await admin.page.getByText(`@${process.env.STUDENT_USERNAME}`, { exact: true }).first().waitFor({ timeout: 30_000 });
    await admin.page.getByText(`@${process.env.OUTSIDER_USERNAME}`, { exact: true }).first().waitFor({ timeout: 30_000 });
  }, admin.page);

  assert(report.browserErrors.length === 0, 'Browser execution must not contain JavaScript, console, request, or HTTP 5xx errors', report.browserErrors);

  report.ok = true;
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  log('ALL PRODUCTION E2E CHECKS PASSED');
} catch (error) {
  report.ok = false;
  report.finishedAt = new Date().toISOString();
  report.fatalError = error instanceof Error ? error.stack ?? error.message : String(error);
  await fs.writeFile(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  throw error;
} finally {
  for (const session of sessions.reverse()) {
    await session.context.close().catch(() => {});
  }
  await browser.close().catch(() => {});
}
