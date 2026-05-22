import { describe, it, expect } from 'vitest';
import {
  normalizeSelection,
  normalizeTaskStatus,
  normalizeSessionMode,
  normalizeDiagnostics,
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

  it('returns undefined for invalid modes', () => {
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

describe('normalizeSelection', () => {
  it('normalizes a valid selection', () => {
    const sel = makeSelection();
    const result = normalizeSelection(sel);
    expect(result.id).toBe('sel-1');
    expect(result.framework).toBe('dom');
  });

  it('forces vue3 framework to vue3', () => {
    const sel = makeSelection({ framework: 'vue3' });
    expect(normalizeSelection(sel).framework).toBe('vue3');
  });

  it('defaults non-vue3 frameworks to dom', () => {
    const sel = makeSelection({ framework: 'react' });
    expect(normalizeSelection(sel).framework).toBe('dom');
  });

  it('throws for missing dom', () => {
    const sel = makeSelection() as unknown as Record<string, unknown>;
    sel.dom = undefined;
    expect(() => normalizeSelection(sel)).toThrow('invalid selection');
  });

  it('throws for missing source', () => {
    const sel = makeSelection() as unknown as Record<string, unknown>;
    sel.source = undefined;
    expect(() => normalizeSelection(sel)).toThrow('invalid selection');
  });

  it('throws for non-object input', () => {
    expect(() => normalizeSelection(null)).toThrow('selection object required');
    expect(() => normalizeSelection('string')).toThrow('selection object required');
  });
});

describe('normalizeTargets', () => {
  it('creates a single-element target array as fallback', () => {
    const sel = makeSelection();
    const targets = normalizeTargets(undefined, sel);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('sel-1');
  });

  it('creates a single-element target for empty array', () => {
    const sel = makeSelection();
    const targets = normalizeTargets([], sel);
    expect(targets).toHaveLength(1);
  });
});

describe('createMessage', () => {
  it('creates a message with correct fields', () => {
    const msg = createMessage('sess-1', 'user', 'hello', 'sel-1');
    expect(msg.sessionId).toBe('sess-1');
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('hello');
    expect(msg.selectionId).toBe('sel-1');
    expect(msg.id).toMatch(/^msg-/);
  });
});

describe('selectionResponse', () => {
  it('returns inactive when no selection', () => {
    const state = new ServerState();
    const resp = selectionResponse(state);
    expect(resp.active).toBe(false);
    expect(resp.selection).toBeNull();
  });
});

describe('appendMessage / appendAssistantMessage', () => {
  it('throws for non-existent session', () => {
    const state = new ServerState();
    expect(() => appendMessage('no-such-session', 'user', 'hi', null, state)).toThrow('session not found');
    expect(() => appendAssistantMessage('no-such-session', 'hi', null, state)).toThrow('session not found');
  });
});

describe('upsertSessionFromSelection', () => {
  it('creates a new session from selection', () => {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    try {
      const state = new ServerState();
      const sel = makeSelection({ source: { root: FIXTURE_DIR, file: 'App.vue', line: 1, column: null } });
      state.setProjectRoot(FIXTURE_DIR);
      upsertSessionFromSelection(sel, state);
      const session = state.sessions.get('sess-1');
      expect(session).toBeDefined();
      expect(session!.status).toBe('sent');
      expect(session!.messages).toHaveLength(1);
      expect(session!.messages[0].role).toBe('user');
    } finally {
      rmSync(FIXTURE_DIR, { recursive: true, force: true });
    }
  });
});
