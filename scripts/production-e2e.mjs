import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const required = [
  'APP_ORIGIN', 'VERCEL_SHARE_URL', 'TEST_PASSWORD',
  'TEACHER_CODE', 'TEACHER_USERNAME',
  'STUDENT_CODE', 'STUDENT_USERNAME',
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
const CLASS_NAME = 'E2E 10-A 260806';
const ASSIGNMENT_TITLE = 'E2E Essay 260806';
const FEEDBACK = 'E2E teacher feedback: clear structure, relevant support, and actionable next steps.';

const report = {
  startedAt: new Date().toISOString(),
  steps: [],
  browserErrors: [],
  assertions: [],
};

await fs.mkdir(OUTPUT_DIR, { recursive: true });

function assert(condition, message, details) {
  report.assertions.push({ ok: Boolean(condition), message, details });
  if (!condition) {
    throw new Error(`${message}${details === undefined ? '' : `\n${JSON.stringify(details, null, 2)}`}`);
  }
}

async function step(name, fn, page) {
  const startedAt = Date.now();
  console.log(`[production-e2e] START ${name}`);
  try {
    const value = await fn();
    report.steps.push({ name, ok: true, durationMs: Date.now() - startedAt });
    console.log(`[production-e2e] PASS  ${name}`);
    return value;
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    report.steps.push({ name, ok: false, durationMs: Date.now() - startedAt, error: message });
    console.log(`[production-e2e] FAIL  ${name}: ${message}`);
    if (page) {
      const filename = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
      await page.screenshot({ path: path.join(OUTPUT_DIR, `${filename}.png`), fullPage: true }).catch(() => {});
      await fs.writeFile(path.join(OUTPUT_DIR, `${filename}.html`), await page.content().catch(() => ''), 'utf8').catch(() => {});
    }
    throw error;
  }
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
    if (!reason.includes('ERR_ABORTED')) {
      report.browserErrors.push({ label, type: 'requestfailed', url: request.url(), message: reason });
    }
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
  return { context, page, capture };
}

async function goto(session, pathname) {
  await session.page.goto(`${APP_ORIGIN}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await session.page.waitForSelector('#root', { timeout: 30_000 });
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

function decodeSubject(token) {
  const encoded = token.split('.')[1];
  if (!encoded) throw new Error('Invalid JWT');
  const payload = JSON.parse(Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  if (!payload.sub) throw new Error('JWT subject missing');
  return payload.sub;
}

async function rest(session, resource, options = {}) {
  const token = await getToken(session);
  const apikey = await poll('Supabase API key capture', async () => session.capture.apikey, Boolean, 20_000, 250);
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${resource}`, {
    method: options.method ?? 'GET',
    headers: {
      apikey,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  return { ok: response.ok, status: response.status, body };
}

async function ownProfile(session) {
  const userId = decodeSubject(await getToken(session));
  const response = await rest(session, `profiles?id=eq.${encodeURIComponent(userId)}&select=id,role,username,school_id,status`);
  assert(response.ok && Array.isArray(response.body) && response.body.length === 1, 'Current profile must be readable', response);
  return response.body[0];
}

const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const sessions = [];
let teacher;
let student;
let teacherProfile;
let assignmentId;
let submissionId;

try {
  await step('Railway health check', async () => {
    const response = await fetch(`${API_URL}/health`);
    const body = await response.text();
    assert(response.ok, 'Railway health endpoint must return success', { status: response.status, body });
  });

  teacher = await createSession(browser, 'teacher');
  sessions.push(teacher);
  await step('Teacher activation', () => activate(
    teacher,
    process.env.TEACHER_CODE,
    process.env.TEACHER_USERNAME,
    '/teacher/dashboard',
  ), teacher.page);

  teacherProfile = await step('Teacher permissions', async () => {
    const profile = await ownProfile(teacher);
    assert(profile.role === 'teacher' && profile.school_id, 'Teacher must be linked to a school', profile);
    const permissions = await rest(
      teacher,
      `teacher_permissions?teacher_id=eq.${encodeURIComponent(profile.id)}&select=permission`,
    );
    assert(permissions.ok && permissions.body.length === 11, 'Teacher must receive all 11 permissions', permissions);
    return profile;
  }, teacher.page);

  let classId;
  await step('Teacher class and student code creation', async () => {
    await goto(teacher, '/teacher/classes');
    await teacher.page.locator('button.btn--primary').first().click();
    await teacher.page.locator('#new-class-name').fill(CLASS_NAME);
    await teacher.page.locator('#new-class-grade').fill('10. Sınıf');
    await teacher.page.locator('#new-class-name')
      .locator('xpath=ancestor::div[contains(@class,"card")]')
      .locator('button.btn--primary')
      .click();
    await teacher.page.getByText(CLASS_NAME, { exact: true }).first().waitFor({ timeout: 30_000 });

    const links = await rest(
      teacher,
      `teacher_classes?teacher_id=eq.${encodeURIComponent(teacherProfile.id)}&select=class_id`,
    );
    assert(links.ok && links.body.length > 0, 'Teacher class link must persist', links);
    const classIds = links.body.map((row) => row.class_id).join(',');
    const classes = await rest(teacher, `school_classes?id=in.(${classIds})&select=id,name,school_id`);
    const created = classes.body?.find((row) => row.name === CLASS_NAME);
    assert(classes.ok && created?.id, 'Created class must be readable', classes);
    classId = created.id;

    const code = await rest(teacher, 'activation_codes', {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        code: process.env.STUDENT_CODE,
        school_id: teacherProfile.school_id,
        class_id: classId,
        role: 'student',
        status: 'unused',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        batch_id: 'e2e-focused-260806',
      },
    });
    assert(code.ok && code.body?.[0]?.code === process.env.STUDENT_CODE, 'Teacher must create student activation code', code);
  }, teacher.page);

  await step('Teacher publishes custom-rubric assignment', async () => {
    await goto(teacher, '/teacher/assignments/new');
    await teacher.page.locator('button.btn--secondary.btn--sm').first().click();
    await teacher.page.locator('#nt-title').fill(ASSIGNMENT_TITLE);
    await teacher.page.locator('#nt-prompt').fill('Write an opinion essay about whether schools should dedicate one lesson each week to practical life skills.');
    await teacher.page.locator('#nt-level').selectOption('B2');
    await teacher.page.locator('#nt-title')
      .locator('xpath=ancestor::div[contains(@class,"card")]')
      .locator('button.btn--primary')
      .click();

    await teacher.page.locator('#ab-title').waitFor({ timeout: 30_000 });
    await teacher.page.locator('#ab-due-at').fill('2026-08-10T12:00');
    await teacher.page.getByLabel(CLASS_NAME, { exact: true }).check();
    await teacher.page.getByRole('button', { name: 'İleri', exact: true }).click();
    await teacher.page.getByRole('button', { name: 'İleri', exact: true }).click();

    await teacher.page.locator('input[id^="weight-"]').first().fill('15');
    await teacher.page.locator('button.btn--secondary.btn--sm').first().click();
    await teacher.page.locator('input[id^="criterion-name-custom_"]').fill('E2E Clarity');
    await teacher.page.locator('input[id^="weight-custom_"]').fill('5');
    await teacher.page.getByText('100%', { exact: true }).waitFor({ timeout: 10_000 });
    await teacher.page.getByRole('button', { name: 'İleri', exact: true }).click();
    await teacher.page.locator('button.btn--primary').last().click();
    await teacher.page.waitForURL((url) => url.pathname === '/teacher/assignments', { timeout: 45_000 });

    const link = teacher.page.getByRole('link', { name: ASSIGNMENT_TITLE, exact: true }).first();
    await link.waitFor({ timeout: 30_000 });
    const href = await link.getAttribute('href');
    const match = href?.match(/\/teacher\/assignments\/([^/?#]+)/);
    assert(match?.[1], 'Assignment ID must be discoverable', { href });
    assignmentId = match[1];

    const assignment = await rest(teacher, `assignments?id=eq.${encodeURIComponent(assignmentId)}&select=*`);
    assert(assignment.ok && assignment.body?.[0]?.status === 'published', 'Assignment must be published', assignment);
    const criteria = await rest(
      teacher,
      `rubric_criteria?rubric_id=eq.${encodeURIComponent(assignment.body[0].rubric_id)}&select=name_key,weight`,
    );
    assert(
      criteria.ok && criteria.body.some((row) => row.name_key === 'E2E Clarity' && Number(row.weight) === 5),
      'Custom criterion must persist',
      criteria,
    );
  }, teacher.page);

  student = await createSession(browser, 'student');
  sessions.push(student);
  await step('Student activation', () => activate(
    student,
    process.env.STUDENT_CODE,
    process.env.STUDENT_USERNAME,
    '/student/home',
  ), student.page);

  await step('Student submits assignment', async () => {
    await goto(student, `/student/assignments/${assignmentId}/write`);
    await student.page.locator('#writing-textarea').waitFor({ timeout: 30_000 });
    await student.page.locator('#writing-textarea').fill(`Schools should dedicate one lesson each week to practical life skills because academic knowledge alone does not prepare students for every responsibility they will face. A regular lesson could teach budgeting, basic first aid, digital safety, communication, and simple household tasks. These topics are useful immediately, but they also help young people become more independent and confident.

Some people argue that the timetable is already crowded and that families should teach these skills. However, not every student has the same opportunities at home. A school lesson would give everyone access to reliable information and guided practice. It would also allow teachers to connect life skills with mathematics, science, language, and citizenship.

The lesson should not replace core subjects. Instead, it could use one flexible period and include short projects assessed through participation rather than stressful examinations. In my view, one practical lesson per week would make education more relevant, fair, and connected to adult life.`);
    await student.page.locator('button.btn--primary.btn--lg').click();
    const dialog = student.page.getByRole('alertdialog');
    await dialog.waitFor({ timeout: 10_000 });
    await dialog.locator('button.btn--primary').click();
    await student.page.getByRole('heading', { name: /gönder/i }).waitFor({ timeout: 30_000 });
  }, student.page);

  await step('AI grading persists', async () => {
    const profile = await ownProfile(student);
    const response = await poll(
      'AI grading',
      () => rest(
        student,
        `submissions?assignment_id=eq.${encodeURIComponent(assignmentId)}&student_id=eq.${encodeURIComponent(profile.id)}&select=*`,
      ),
      (value) => value.ok
        && value.body?.length === 1
        && ['teacher_review_pending', 'result_ready', 'grading_failed'].includes(value.body[0].status),
      180_000,
      3_000,
    );
    const submission = response.body[0];
    assert(submission.status !== 'grading_failed', 'AI grading must not fail', submission);
    assert(submission.ai_score !== null, 'AI score must persist', submission);
    submissionId = submission.id;

    const scores = await rest(student, `criterion_scores?submission_id=eq.${encodeURIComponent(submissionId)}&select=*`);
    assert(scores.ok && scores.body.length >= 6, 'Criterion scores must persist', scores);
  }, student.page);

  await step('Teacher publishes review', async () => {
    await goto(teacher, `/teacher/submissions/${submissionId}`);
    await teacher.page.locator('#teacher-feedback').waitFor({ timeout: 60_000 });
    await teacher.page.locator('#teacher-feedback').fill(FEEDBACK);
    const section = teacher.page.locator('#teacher-feedback').locator('xpath=ancestor::section');
    await section.locator('button.btn--primary').click();

    const response = await poll(
      'Teacher review',
      () => rest(
        teacher,
        `submissions?id=eq.${encodeURIComponent(submissionId)}&select=status,score_visible_to_student,teacher_feedback,final_score`,
      ),
      (value) => value.ok
        && value.body?.[0]?.status === 'result_ready'
        && value.body[0].score_visible_to_student === true,
      60_000,
      1_000,
    );
    assert(response.body[0].teacher_feedback === FEEDBACK, 'Teacher feedback must persist', response.body[0]);
    assert(response.body[0].final_score !== null, 'Final score must be visible', response.body[0]);
  }, teacher.page);

  await step('Student sees final result', async () => {
    await goto(student, `/student/submissions/${submissionId}/result`);
    await student.page.getByRole('heading', { name: ASSIGNMENT_TITLE, exact: true }).waitFor({ timeout: 45_000 });
    await student.page.getByText(FEEDBACK, { exact: true }).waitFor({ timeout: 30_000 });
    await student.page.locator('.score-ring').waitFor({ timeout: 30_000 });
  }, student.page);

  assert(report.browserErrors.length === 0, 'Browser run must not include errors', report.browserErrors);

  report.ok = true;
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log('[production-e2e] ALL FOCUSED PRODUCTION CHECKS PASSED');
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
