import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  normalizeSelection,
  normalizeTaskStatus,
  normalizeSessionMode,
  normalizeDiagnostics,
  normalizeStyleSourceHints,
  normalizeTargets,
  selectionResponse,
  createMessage,
  appendMessage,
  appendAssistantMessage,
  upsertSessionFromSelection,
} from './sessions.js';
import { ServerState } from './state.js';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import type { UiInspectSelection } from '@ui-inspect/protocol';

const FIXTURE_DIR = join(tmpdir(), 'ui-inspect-session-test');

function makeSelection(overrides: Partial<UiInspectSelection> = {}): UiInspectSelection {
  return {
    id: 'sel-1',
    sessionId: 'sess-1',
    url: 'http://localhost:5173',
    title: 'Test Page',
    timestamp: Date.now(),
    instruction: 'fix the button',
    framework: 'dom',
    dom: {
      selector: 'button.btn',
      tagName: 'button',
      id: '',
      className: 'btn',
      text: 'Click',
      outerHtml: '<button class="btn">Click</button>',
      rect: { x: 10, y: 20, width: 80, height: 30 },
      styles: { color: 'red' },
    },
    source: { root: '/project', file: 'src/App.vue', line: 42, column: 5 },
    ...overrides,
  };
}

describe('normalizeTaskStatus', () => {
  it('returns valid statuses as-is', () => {
    expect(normalizeTaskStatus('draft')).toBe('draft');
    expect(normalizeTaskStatus('sent')).toBe('sent');
    expect(normalizeTaskStatus('claimed')).toBe('claimed');
    expect(normalizeTaskStatus('working')).toBe('working');
    expect(normalizeTaskStatus('done')).toBe('done');
    expect(normalizeTaskStatus('failed')).toBe('failed');
  });

  it('defaults invalid values to "working"', () => {
    expect(normalizeTaskStatus('unknown')).toBe('working');
    expect(normalizeTaskStatus(null)).toBe('working');
    expect(normalizeTaskStatus(undefined)).toBe('working');
    expect(normalizeTaskStatus(123)).toBe('working');
  });
});

describe('normalizeSessionMode', () => {
  it('returns valid modes', () => {
    expect(normalizeSessionMode('source')).toBe('source');
    expect(normalizeSessionMode('single')).toBe('single');
    expect(normalizeSessionMode('batch')).toBe('batch');
    expect(normalizeSessionMode('troubleshoot')).toBe('troubleshoot');
  });

  it('returns undefined for invalid modes including css-debug', () => {
    expect(normalizeSessionMode('css-debug')).toBeUndefined();
    expect(normalizeSessionMode('unknown')).toBeUndefined();
    expect(normalizeSessionMode(null)).toBeUndefined();
    expect(normalizeSessionMode(undefined)).toBeUndefined();
  });
});

describe('normalizeDiagnostics', () => {
  it('normalizes valid diagnostics', () => {
    const result = normalizeDiagnostics({
      runtimeEvents: [{ id: '1', level: 'error', kind: 'console', message: 'oops', timestamp: 1000, url: 'http://x' }],
      capturedAt: 2000,
    });
    expect(result).toBeDefined();
    expect(result!.runtimeEvents).toHaveLength(1);
    expect(result!.capturedAt).toBe(2000);
  });

  it('returns undefined for missing runtimeEvents', () => {
    expect(normalizeDiagnostics({})).toBeUndefined();
    expect(normalizeDiagnostics(null)).toBeUndefined();
    expect(normalizeDiagnostics(undefined)).toBeUndefined();
  });
});

describe('normalizeStyleSourceHints', () => {
  it('returns undefined for non-array input', () => {
    expect(normalizeStyleSourceHints(null)).toBeUndefined();
    expect(normalizeStyleSourceHints({})).toBeUndefined();
    expect(normalizeStyleSourceHints('string')).toBeUndefined();
  });

  it('returns undefined for empty array', () => {
    expect(normalizeStyleSourceHints([])).toBeUndefined();
  });

  it('normalizes valid style source hints', () => {
    const result = normalizeStyleSourceHints([{
      id: 'hint-1',
      targetId: 'target-1',
      kind: 'vue-sfc-style-rule',
      file: 'src/App.vue',
      line: 10,
      column: 1,
      selector: '.btn',
      matchedBy: ['class:btn'],
      properties: ['color', 'padding'],
      confidence: 0.9,
      reason: 'Matched selector .btn',
      snippet: '.btn { color: red; padding: 8px; }',
    }]);
    expect(result).toHaveLength(1);
    expect(result![0].kind).toBe('vue-sfc-style-rule');
    expect(result![0].file).toBe('src/App.vue');
    expect(result![0].confidence).toBe(0.9);
  });
});

describe('normalizeTargets', () => {
  it('creates a default target from selection', () => {
    const sel = makeSelection();
    const targets = normalizeTargets(undefined, sel);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('sel-1');
    expect(targets[0].selection.id).toBe('sel-1');
  });

  it('normalizes target array', () => {
    const sel = makeSelection();
    const targets = normalizeTargets([{
      id: 't-1',
      note: 'make it blue',
      selection: sel,
    }], sel);
    expect(targets).toHaveLength(1);
    expect(targets[0].note).toBe('make it blue');
  });
});

describe('session lifecycle', () => {
  let state: ServerState;
  beforeEach(() => {
    try { mkdirSync(FIXTURE_DIR, { recursive: true }); } catch {}
    state = new ServerState(FIXTURE_DIR);
    state.sessions.clear();
  });
  afterEach(() => {
    try { rmSync(FIXTURE_DIR, { recursive: true, force: true }); } catch {}
  });

  it('upsertSessionFromSelection creates new session', () => {
    const sel = makeSelection();
    upsertSessionFromSelection(sel, state);
    const session = state.sessions.get('sess-1');
    expect(session).toBeDefined();
    expect(session!.selection!.id).toBe('sel-1');
    expect(session!.status).toBe('sent');
    expect(session!.messages).toHaveLength(1);
    expect(session!.messages[0].content).toBe('fix the button');
  });

  it('upsertSessionFromSelection updates existing session', () => {
    const sel1 = makeSelection({ instruction: 'first' });
    upsertSessionFromSelection(sel1, state);
    const sel2 = makeSelection({ instruction: 'second' });
    upsertSessionFromSelection(sel2, state);
    const session = state.sessions.get('sess-1');
    expect(session!.messages).toHaveLength(2);
  });

  it('appendMessage adds user message', () => {
    const sel = makeSelection();
    upsertSessionFromSelection(sel, state);
    const msg = appendMessage('sess-1', 'user', 'hello', null, state);
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('hello');
    const session = state.sessions.get('sess-1');
    expect(session!.messages).toHaveLength(2);
  });

  it('appendAssistantMessage appends to existing assistant message', () => {
    const sel = makeSelection();
    upsertSessionFromSelection(sel, state);
    const msg1 = appendMessage('sess-1', 'assistant', 'hello', null, state);
    const msg2 = appendAssistantMessage('sess-1', ' world', null, state);
    expect(msg2.id).toBe(msg1.id);
    expect(msg2.content).toBe('hello world');
    const session = state.sessions.get('sess-1');
    expect(session!.messages).toHaveLength(2);
  });

  it('appendAssistantMessage creates new when last is user', () => {
    const sel = makeSelection();
    upsertSessionFromSelection(sel, state);
    const msg = appendAssistantMessage('sess-1', 'response', null, state);
    expect(msg.role).toBe('assistant');
    expect(msg.content).toBe('response');
    const session = state.sessions.get('sess-1');
    expect(session!.messages).toHaveLength(2);
  });
});

describe('selectionResponse', () => {
  let state: ServerState;
  beforeEach(() => {
    try { mkdirSync(FIXTURE_DIR, { recursive: true }); } catch {}
    state = new ServerState(FIXTURE_DIR);
    state.sessions.clear();
  });
  afterEach(() => {
    try { rmSync(FIXTURE_DIR, { recursive: true, force: true }); } catch {}
  });

  it('returns inactive when no selection', () => {
    const result = selectionResponse(state);
    expect(result.active).toBe(false);
    expect(result.selection).toBeNull();
  });

  it('returns active when selection is fresh', () => {
    const sel = makeSelection();
    upsertSessionFromSelection(sel, state);
    state.currentSelection = sel;
    state.currentSelectionReceivedAt = Date.now();
    const result = selectionResponse(state);
    expect(result.active).toBe(true);
    expect(result.selection!.id).toBe('sel-1');
  });
});
