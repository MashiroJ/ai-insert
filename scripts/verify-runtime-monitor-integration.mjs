import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientSourcePath = path.join(root, 'packages/vite-plugin/src/client-source.ts');
const runtimeMonitorPath = path.join(root, 'packages/vite-plugin/src/core/runtime-monitor.ts');
const maxClientSourceLines = 800;

const [clientSourceTs, runtimeMonitorTs] = await Promise.all([
  readFile(clientSourcePath, 'utf8'),
  readFile(runtimeMonitorPath, 'utf8'),
]);

const clientSourceLines = clientSourceTs.split('\n').length;
assert.ok(
  clientSourceLines <= maxClientSourceLines,
  `client-source.ts should stay below ${maxClientSourceLines} lines, got ${clientSourceLines}`,
);

assert.match(
  runtimeMonitorTs,
  /export function runtimeMonitorClientSource/,
  'runtime-monitor.ts must export runtimeMonitorClientSource',
);
assert.match(
  clientSourceTs,
  /runtimeMonitorClientSource/,
  'client-source.ts must import and use runtimeMonitorClientSource',
);

const { clientSource } = await import('../packages/vite-plugin/dist/client-source.js');
const generated = clientSource({
  daemonUrl: 'http://127.0.0.1:17321',
  root,
});

new Function(generated);

for (const expected of [
  'function installStyle()',
  'function ensureToggle()',
  'function selectionPayloadFor(el, instruction, sessionId)',
  'function runtimeEventsForPanel()',
  'function openBatchSidebar()',
  'async function fetchSessions()',
  'function startSessionStream(sessionId)',
  'const runtimeEvents = []',
  'function installRuntimeCapture()',
  'function recordRuntimeEvent(kind, level, args)',
  'function redactRuntimeText(value)',
  'installRuntimeCapture();',
]) {
  assert.ok(generated.includes(expected), `generated client source is missing: ${expected}`);
}

assert.equal(
  (generated.match(/function installRuntimeCapture\(\)/g) || []).length,
  1,
  'generated client source should install runtime capture exactly once',
);

console.log('runtime monitor integration ok');
