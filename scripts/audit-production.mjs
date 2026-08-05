import { execFileSync } from 'node:child_process';

const ALLOWED_ADVISORIES = new Map([
  [
    'https://github.com/advisories/GHSA-qwww-vcr4-c8h2',
    {
      reason: 'Only affects unstable React Server Components APIs; Pasific uses declarative BrowserRouter mode.',
      expires: '2026-09-15',
    },
  ],
]);

function runAudit() {
  try {
    return execFileSync('npm', ['audit', '--omit=dev', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'stdout' in error) {
      return String(error.stdout);
    }
    throw error;
  }
}

const report = JSON.parse(runAudit());
const vulnerabilities = report.vulnerabilities ?? {};
const cache = new Map();

function isAllowedPackage(packageName, stack = new Set()) {
  if (cache.has(packageName)) return cache.get(packageName);
  if (stack.has(packageName)) return false;

  const vulnerability = vulnerabilities[packageName];
  if (!vulnerability) return true;

  const nextStack = new Set(stack).add(packageName);
  const result = (vulnerability.via ?? []).every((via) => {
    if (typeof via === 'string') return isAllowedPackage(via, nextStack);

    const exception = ALLOWED_ADVISORIES.get(via.url);
    if (!exception) return false;
    if (Date.now() > new Date(`${exception.expires}T00:00:00Z`).getTime()) return false;

    console.warn(`[audit] Temporarily allowing ${via.url}: ${exception.reason} Expires ${exception.expires}.`);
    return true;
  });

  cache.set(packageName, result);
  return result;
}

const blocked = Object.keys(vulnerabilities).filter((packageName) => !isAllowedPackage(packageName));

if (blocked.length > 0) {
  console.error(`[audit] Unapproved production vulnerabilities: ${blocked.join(', ')}`);
  process.exit(1);
}

const metadata = report.metadata?.vulnerabilities ?? {};
console.log(
  `[audit] Passed with ${metadata.critical ?? 0} critical, ${metadata.high ?? 0} high, ${metadata.moderate ?? 0} moderate, and ${metadata.low ?? 0} low reported findings after scoped policy evaluation.`,
);
