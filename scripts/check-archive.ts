import { WaybackClient } from '../src/archive';
import { publicOrigin } from '../src/shared';
import { mkdir, writeFile } from 'node:fs/promises';

const origins = process.argv.slice(2);
if (!origins.length) origins.push('https://www.wikipedia.org', 'https://www.python.org');
const results = [];
for (const value of origins.slice(0, 3)) {
  const origin = publicOrigin(value);
  if (!origin) throw new Error('Supply a public website origin.');
  const started = Date.now();
  try {
    const pack = await new WaybackClient().load(origin, 2019);
    results.push({ origin, status: 'profile-ready', elapsedMs: Date.now() - started, capturedAt: pack.capturedAt, rules: pack.ruleCount });
  } catch (error) {
    results.push({ origin, status: 'current-style-fallback', elapsedMs: Date.now() - started, reason: error instanceof Error ? error.message : 'Archive unavailable' });
  }
}
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/live-archive-check.json', JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
if (!results.some(result => result.status === 'profile-ready')) process.exitCode = 1;
