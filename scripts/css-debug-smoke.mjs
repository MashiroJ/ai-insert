#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

process.env.NO_PROXY = mergeNoProxy(process.env.NO_PROXY || process.env.no_proxy || '');
process.env.no_proxy = process.env.NO_PROXY;
delete process.env.all_proxy;
delete process.env.ALL_PROXY;

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const DAEMON_URL = process.env.UI_INSPECT_DAEMON_URL || 'http://127.0.0.1:17321';

const EXAMPLES = {
  vite: {
    name: '@ui-inspect/example-vite-vue3',
    url: 'http://localhost:5173/',
    ready: /Local:\s+http:\/\/(?:localhost|127\.0\.0\.1):5173\//,
  },
  webpack: {
    name: '@ui-inspect/example-webpack-vue3',
    url: 'http://localhost:3200/',
    ready: /(?:Loopback|Local):\s+http:\/\/(?:localhost|127\.0\.0\.1):3200\//,
  },
  rspack: {
    name: '@ui-inspect/example-rspack-vue3',
    url: 'http://localhost:3201/',
    ready: /(?:Project is running|Loopback|Local).*3201/s,
  },
  rsbuild: {
    name: '@ui-inspect/example-rsbuild-vue3',
    url: 'http://localhost:3202/',
    ready: /Local:\s+http:\/\/(?:localhost|127\.0\.0\.1):3202\//,
  },
  'next-app': {
    name: '@ui-inspect/example-next-app-router',
    url: 'http://localhost:3203/',
    script: 'dev',
    ready: /(?:Local:|Ready in|started server).*3203/s,
  },
  'next-pages': {
    name: '@ui-inspect/example-next-pages-router',
    url: 'http://localhost:3204/',
    script: 'dev',
    ready: /(?:Local:|Ready in|started server).*3204/s,
  },
};

const CSS_DEBUG_SELECTORS = {
  toggle: '#ui-inspect-toggle',
  cssModeButton: [
    '[data-mode="css-debug"]',
    '[data-mode="css"]',
    '[data-action="css-debug"]',
    'button[aria-label*="CSS"]',
    'button[aria-label*="样式"]',
  ].join(', '),
  panel: [
    '#ui-inspect-css-panel',
    '#ui-inspect-panel[data-mode="css-debug"]',
    '[data-ui-inspect-panel="css-debug"]',
    '[data-panel="css-debug"]',
  ].join(', '),
  target: '.feature-card, .primary-button, h1, button',
  send: [
    '[data-action="send-css-debug"]',
    '[data-css-action="send"]',
    '[data-action="send"]',
    'button[type="submit"]',
  ].join(', '),
  reset: [
    '[data-action="reset-css"]',
    '[data-css-action="reset"]',
    '[data-action="reset"]',
    'button[aria-label*="Reset"]',
    'button[aria-label*="重置"]',
  ].join(', '),
};

const CSS_VALUES = {
  padding: ['18px', '24px'],
  'border-radius': ['12px', '20px'],
  'background-color': ['rgb(255, 244, 214)', 'rgb(219, 234, 254)'],
  'font-size': ['18px', '20px'],
};

const args = parseArgs(process.argv.slice(2));
const exampleKey = args.example || 'vite';
const example = EXAMPLES[exampleKey];
if (!example) fail(`Unknown example "${exampleKey}". Use one of: ${Object.keys(EXAMPLES).join(', ')}`);

const started = [];

try {
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const { chromium } = await loadPlaywright();
  if (!args['skip-build']) await runOnce('pnpm', ['--filter', '@ui-inspect/cli', 'build']);

  if (!args['skip-daemon']) {
    started.push(startProcess('daemon', 'node', ['packages/cli/dist/index.js', 'daemon'], /ui-inspect daemon listening/));
    await started[started.length - 1].ready;
  }

  if (!args['skip-dev']) {
    const script = example.script || 'dev';
    started.push(startProcess(exampleKey, 'pnpm', ['--filter', example.name, script], example.ready));
    await started[started.length - 1].ready;
  }

  await waitForHttp(`${DAEMON_URL}/health`);
  await postJson(`${DAEMON_URL}/selection/clear`, {});

  const browser = await chromium.launch({ headless: args.headless !== 'false' });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.setDefaultTimeout(Number(args.timeout || 15000));
    await page.goto(example.url, { waitUntil: 'networkidle' });

    await assertUiInspectReady(page);
    await runCssDebugFlow(page);
    const session = await waitForCssDebugSession();
    assertCssDebugSession(session);

    console.log(`CSS debug smoke passed for ${exampleKey}: ${session.id}`);
  } finally {
    await browser.close();
  }
} catch (err) {
  console.error(formatError(err));
  process.exitCode = 1;
} finally {
  for (const processHandle of started.reverse()) processHandle.stop();
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    fail([
      'Playwright is required for this smoke runner.',
      'Install it in the workspace before running this script:',
      '  pnpm add -Dw playwright',
      '  pnpm exec playwright install chromium',
    ].join('\n'));
  }
}

async function assertUiInspectReady(page) {
  await page.waitForSelector(CSS_DEBUG_SELECTORS.toggle, { state: 'visible' });
  const dianaStatus = await page.evaluate(async () => {
    for (const url of ['/@ui-inspect/diana.webp', '/api/ui-inspect/diana']) {
      const resp = await fetch(url, { cache: 'no-store' }).catch(() => null);
      if (resp?.ok) return { ok: true, status: resp.status, url };
    }
    return { ok: false, status: 0, url: '' };
  });
  if (!dianaStatus.ok) fail(`Diana asset did not return 200, got ${dianaStatus.status}`);
}

async function runCssDebugFlow(page) {
  await page.click(CSS_DEBUG_SELECTORS.toggle);
  await assertExistingModeHooks(page);
  await page.waitForSelector(CSS_DEBUG_SELECTORS.cssModeButton, { state: 'visible' }).catch(() => {
    throw new Error([
      'CSS debug entry was not found.',
      'Expected one of these selectors:',
      `  ${CSS_DEBUG_SELECTORS.cssModeButton}`,
      'Subagent A should expose a stable CSS mode button hook, preferably data-mode="css-debug".',
    ].join('\n'));
  });
  await page.click(CSS_DEBUG_SELECTORS.cssModeButton);
  await page.waitForSelector(CSS_DEBUG_SELECTORS.target, { state: 'visible' });
  await page.click(CSS_DEBUG_SELECTORS.target);
  await page.waitForSelector(CSS_DEBUG_SELECTORS.panel, { state: 'visible' }).catch(() => {
    throw new Error([
      'CSS debug panel was not found after selecting a target.',
      'Expected one of these selectors:',
      `  ${CSS_DEBUG_SELECTORS.panel}`,
      'Subagent A should expose a stable panel hook, preferably id="ui-inspect-css-panel".',
    ].join('\n'));
  });

  await applyCssValues(page, {
    padding: CSS_VALUES.padding[0],
    'border-radius': CSS_VALUES['border-radius'][0],
    'background-color': CSS_VALUES['background-color'][0],
    'font-size': CSS_VALUES['font-size'][0],
  });
  await expectInlinePreview(page, {
    padding: CSS_VALUES.padding[0],
    'border-radius': CSS_VALUES['border-radius'][0],
    'background-color': CSS_VALUES['background-color'][0],
    'font-size': CSS_VALUES['font-size'][0],
  });

  await page.click(CSS_DEBUG_SELECTORS.reset).catch(() => {
    throw new Error([
      'CSS debug reset control was not found.',
      'Expected one of these selectors:',
      `  ${CSS_DEBUG_SELECTORS.reset}`,
    ].join('\n'));
  });
  await delay(100);

  await applyCssValues(page, {
    padding: CSS_VALUES.padding[1],
    'border-radius': CSS_VALUES['border-radius'][1],
    'background-color': CSS_VALUES['background-color'][1],
    'font-size': CSS_VALUES['font-size'][1],
  });
  await expectInlinePreview(page, {
    padding: CSS_VALUES.padding[1],
    'border-radius': CSS_VALUES['border-radius'][1],
    'background-color': CSS_VALUES['background-color'][1],
    'font-size': CSS_VALUES['font-size'][1],
  });
  await expectCssDebugSummary(page);
  await expectChangedOnlyView(page);

  await maybeFillNote(page);
  await page.click(CSS_DEBUG_SELECTORS.send);
}

async function assertExistingModeHooks(page) {
  for (const mode of ['batch', 'troubleshoot']) {
    const count = await page.locator(`[data-mode="${mode}"]`).count();
    if (!count) {
      fail(`Existing Diana mode hook is missing: data-mode="${mode}"`);
    }
  }
}

async function applyCssValues(page, values) {
  for (const [property, value] of Object.entries(values)) {
    await setCssControl(page, property, value);
  }
}

async function setCssControl(page, property, value) {
  const primaryControl = `[data-css-property="${property}"] [data-css-input="${property}"]`;
  const control = await page.locator(primaryControl).first().count() ? primaryControl : cssControlSelector(property);
  const found = await page.locator(control).first().count();
  if (!found) {
    throw new Error([
      `CSS control for "${property}" was not found.`,
      'Expected a stable hook shaped like:',
      `  [data-css-prop="${property}"] input`,
      `  input[name="${property}"]`,
    ].join('\n'));
  }
  const locator = page.locator(control).first();
  const tagName = await locator.evaluate((el) => el.tagName.toLowerCase());
  if (tagName === 'select') {
    await locator.selectOption(value);
    return;
  }
  await locator.fill(value);
  await locator.dispatchEvent('input');
  await locator.dispatchEvent('change');
}

function cssControlSelector(property) {
  return [
    `[data-css-property="${property}"] [data-css-input="${property}"]`,
    `[data-css-prop="${property}"] input`,
    `[data-css-prop="${property}"] select`,
    `[data-css-prop="${property}"] textarea`,
    `[data-css-property="${property}"] input:not([type="range"])`,
    `[data-css-property="${property}"] select`,
    `input[name="${property}"]`,
    `select[name="${property}"]`,
  ].join(', ');
}

async function expectInlinePreview(page, expected) {
  const actual = await page.$eval(CSS_DEBUG_SELECTORS.target, (el, props) => {
    const styles = getComputedStyle(el);
    return Object.fromEntries(props.map((prop) => [prop, styles.getPropertyValue(prop)]));
  }, Object.keys(expected));

  for (const [property, value] of Object.entries(expected)) {
    if (!normalizesClose(actual[property], value)) {
      fail(`Preview style mismatch for ${property}: expected ${value}, got ${actual[property]}`);
    }
  }
}

async function expectCssDebugSummary(page) {
  const text = await page.locator('.ui-inspect-css-diff').first().textContent();
  for (const expected of ['主动改动', '连带影响', '父级布局']) {
    if (!text?.includes(expected)) fail(`CSS debug summary missing "${expected}". Actual: ${text || '(empty)'}`);
  }
}

async function expectChangedOnlyView(page) {
  await page.click('[data-action="toggle-changed-only"]');
  const visibleRows = await page.locator('[data-css-property]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-css-property')));
  for (const property of ['padding', 'border-radius', 'background-color', 'font-size']) {
    if (!visibleRows.includes(property)) fail(`Changed-only view missing edited property "${property}".`);
  }
  if (visibleRows.includes('display') || visibleRows.includes('justify-content')) {
    fail(`Changed-only view should hide untouched layout controls, got: ${visibleRows.join(', ')}`);
  }
  await page.click('[data-action="toggle-changed-only"]');
}

async function maybeFillNote(page) {
  const selector = [
    '#ui-inspect-css-note',
    'textarea[name="css-debug-note"]',
    '[data-css-debug-note]',
    'textarea[placeholder*="CSS"]',
    'textarea[placeholder*="样式"]',
  ].join(', ');
  const count = await page.locator(selector).first().count();
  if (count) {
    await page.locator(selector).first().fill('Smoke test: make the selected card more spacious and rounded.');
  }
}

async function waitForCssDebugSession() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const sessions = await getJson(`${DAEMON_URL}/sessions`).then((payload) => payload.sessions || []);
    const session = sessions.find((item) => item.mode === 'css-debug');
    if (session) return session;
    await delay(250);
  }
  const latest = await getJson(`${DAEMON_URL}/sessions`).then((payload) => payload.sessions?.[0] || null).catch(() => null);
  throw new Error([
    'Daemon did not receive a css-debug session.',
    latest ? `Latest session mode was "${latest.mode || '(missing)'}".` : 'No sessions were found.',
    'Subagent B should allow mode="css-debug" and persist cssDebug/style diff payloads.',
  ].join('\n'));
}

function assertCssDebugSession(session) {
  const cssDebug = session.cssDebug || session.selection?.cssDebug || session.selection?.context?.cssDebug;
  if (!cssDebug) fail('css-debug session did not include cssDebug payload.');
  const changedStyles = cssDebug.changedStyles || cssDebug.diff || cssDebug.styleDiff;
  if (!changedStyles || typeof changedStyles !== 'object') fail('cssDebug payload did not include changedStyles diff.');
  if ('width' in changedStyles || 'height' in changedStyles) {
    fail('changedStyles should only include user-edited properties; width/height side effects belong in computedEffects.self.');
  }

  for (const [property, value] of Object.entries({
    padding: CSS_VALUES.padding[1],
    'border-radius': CSS_VALUES['border-radius'][1],
    'background-color': CSS_VALUES['background-color'][1],
    'font-size': CSS_VALUES['font-size'][1],
  })) {
    const actual = changedStyles[property]?.previewValue ?? changedStyles[property]?.value ?? changedStyles[property]?.to ?? changedStyles[property];
    if (!actual || !normalizesClose(String(actual), value)) {
      fail(`changedStyles.${property} mismatch: expected ${value}, got ${actual ?? '(missing)'}`);
    }
  }

  const selfEffects = cssDebug.computedEffects?.self || {};
  if (!selfEffects.width && !selfEffects.height) {
    fail('cssDebug.computedEffects.self should include layout side effects such as width or height changes.');
  }
  if (!cssDebug.layoutContext?.parent || !Array.isArray(cssDebug.layoutContext.siblings)) {
    fail('cssDebug.layoutContext should include parent and sibling layout context.');
  }
}

function startProcess(label, command, commandArgs, readyPattern) {
  const child = spawn(command, commandArgs, {
    cwd: ROOT,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const timeout = setTimeout(() => {
    rejectReady(new Error(`${label} did not become ready. Recent output:\n${tail(output)}`));
  }, 45000);
  const onData = (chunk) => {
    output += chunk.toString();
    if (readyPattern.test(output)) {
      clearTimeout(timeout);
      resolveReady();
    }
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.once('exit', (code) => {
    clearTimeout(timeout);
    if (code !== 0) rejectReady(new Error(`${label} exited with ${code}. Recent output:\n${tail(output)}`));
  });
  return {
    ready,
    stop() {
      if (!child.killed) child.kill('SIGTERM');
    },
  };
}

async function runOnce(command, commandArgs) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { cwd: ROOT, stdio: 'inherit' });
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} ${commandArgs.join(' ')} exited with ${code}`)));
  });
}

async function waitForHttp(url) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return;
    } catch {}
    await delay(200);
  }
  fail(`Timed out waiting for ${url}`);
}

async function getJson(url) {
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) throw new Error(`${url} returned ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

async function postJson(url, body) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`${url} returned ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

function normalizesClose(actual, expected) {
  return normalizeCssValue(actual) === normalizeCssValue(expected);
}

function normalizeCssValue(value) {
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') result.help = true;
    else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) result[key] = true;
      else {
        result[key] = next;
        i += 1;
      }
    }
  }
  return result;
}

function mergeNoProxy(value) {
  const items = new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
  ['localhost', '127.0.0.1', '::1'].forEach((item) => items.add(item));
  return Array.from(items).join(',');
}

function printHelp() {
  console.log(`Usage:
  node scripts/css-debug-smoke.mjs [--example vite] [--headless false]

Examples:
  node scripts/css-debug-smoke.mjs --example vite
  node scripts/css-debug-smoke.mjs --example rsbuild --headless false
  node scripts/css-debug-smoke.mjs --example vite --skip-daemon --skip-dev

Supported examples:
  ${Object.keys(EXAMPLES).join(', ')}

Stable hooks expected from the CSS debug UI:
  mode button: data-mode="css-debug"
  panel:       #ui-inspect-panel[data-mode="css-debug"] or id="ui-inspect-css-panel"
  controls:    [data-css-property="<css property>"] [data-css-input]
  reset:       data-action="reset-css"
  send:        data-action="send" or data-action="send-css-debug"
`);
}

function tail(value) {
  return value.split('\n').slice(-40).join('\n');
}

function fail(message) {
  throw new Error(message);
}

function formatError(err) {
  return err instanceof Error ? err.stack || err.message : String(err);
}
