import { describe, it, expect } from 'vitest';
import {
  normalizeSelection,
  normalizeTaskStatus,
  normalizeSessionMode,
  normalizeDiagnostics,
  normalizeCssDebugPayload,
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
    expect(normalizeSessionMode('css-debug')).toBe('css-debug');
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

describe('normalizeCssDebugPayload', () => {
  it('normalizes css debug payload with style diffs and session info', () => {
    const sel = makeSelection({ note: 'make it calmer' });
    const result = normalizeCssDebugPayload({
      originalStyles: {
        padding: '8px',
        opacity: 1,
      },
      previewStyles: {
        padding: '16px',
        opacity: '0.8',
      },
      changedStyles: {
        padding: {
          originalValue: '8px',
          previewValue: '16px',
        },
        opacity: {
          originalValue: 1,
          previewValue: '0.8',
        },
      },
      computedEffects: {
        self: {
          width: {
            from: '320px',
            to: '304px',
          },
        },
      },
      layoutContext: {
        parent: {
          selector: '.grid',
          tagName: 'section',
          className: 'grid',
          text: 'Cards',
          rect: { x: 0, y: 0, width: 720, height: 160 },
          styles: { display: 'grid', gap: '16px' },
        },
        siblings: [{
          selector: '.card:nth-child(2)',
          tagName: 'article',
          className: 'card',
          text: 'Sibling',
          beforeRect: { x: 360, y: 0, width: 320, height: 80 },
          afterRect: { x: 372, y: 0, width: 320, height: 80 },
        }],
        children: [],
      },
      sourceHints: [{ kind: 'style', file: 'src/App.css', line: 12, column: 3, confidence: 0.9, reason: 'matched selector' }],
      session: {
        id: 'sess-1',
        root: '/project',
      },
    }, sel);

    expect(result).toBeDefined();
    expect(result!.selection.id).toBe('sel-1');
    expect(result!.selectedElement.selector).toBe('button.btn');
    expect(result!.originalStyles).toEqual({ padding: '8px', opacity: '1' });
    expect(result!.previewStyles.padding).toBe('16px');
    expect(result!.changedStyles.padding).toEqual({ originalValue: '8px', previewValue: '16px' });
    expect(result!.changedStyles.opacity).toEqual({ originalValue: '1', previewValue: '0.8' });
    expect(result!.computedEffects!.self.width).toEqual({ originalValue: '320px', previewValue: '304px' });
    expect(result!.layoutContext!.parent!.styles!.display).toBe('grid');
    expect(result!.layoutContext!.siblings[0]).toMatchObject({
      selector: '.card:nth-child(2)',
      sizeChanged: false,
      positionChanged: true,
    });
    expect(result!.note).toBe('make it calmer');
    expect(result!.sourceHints).toHaveLength(1);
    expect(result!.session).toMatchObject({
      id: 'sess-1',
      url: 'http://localhost:5173',
      title: 'Test Page',
      root: '/project',
    });
  });

  it('normalizes css debug interactions and primary interaction', () => {
    const sel = makeSelection();
    const interactions = Array.from({ length: 22 }, (_, index) => ({
      type: index === 0 ? 'move' : index === 1 ? 'resize' : 'unknown',
      handle: index === 0 ? 'move' : index === 1 ? 'se' : 'bad',
      properties: ['transform', index, null, 'width'],
      rectBefore: { x: 'bad', y: 20, width: 80, height: 30 },
      rectAfter: { x: 15, y: 25, width: 90, height: 35 },
      delta: { x: 5, y: 5, width: 10, height: 5 },
      strategy: index === 0 ? 'transform-preview' : 'bad',
      timestamp: index === 0 ? 1234 : 'bad',
      extra: 'drop me',
    }));

    const result = normalizeCssDebugPayload({
      interactions,
      primaryInteraction: {
        type: 'move',
        handle: 'move',
        properties: ['transform'],
        rectBefore: { x: 10, y: 20, width: 80, height: 30 },
        rectAfter: { x: 18, y: 24, width: 80, height: 30 },
        delta: { x: 8, y: 4, width: 0, height: 0 },
        strategy: 'transform-preview',
        timestamp: 5678,
        extra: 'drop me too',
      },
    }, sel);

    expect(result).toBeDefined();
    expect(result!.interactions).toHaveLength(20);
    expect(result!.interactions![0]).toEqual({
      type: 'move',
      handle: 'move',
      properties: ['transform', 'width'],
      rectBefore: { x: 0, y: 20, width: 80, height: 30 },
      rectAfter: { x: 15, y: 25, width: 90, height: 35 },
      delta: { x: 5, y: 5, width: 10, height: 5 },
      strategy: 'transform-preview',
      timestamp: 1234,
    });
    expect(result!.interactions![2]).toMatchObject({
      type: 'panel-control',
      handle: undefined,
      properties: ['transform', 'width'],
      strategy: 'inline-style',
    });
    expect(result!.primaryInteraction).toEqual({
      type: 'move',
      handle: 'move',
      properties: ['transform'],
      rectBefore: { x: 10, y: 20, width: 80, height: 30 },
      rectAfter: { x: 18, y: 24, width: 80, height: 30 },
      delta: { x: 8, y: 4, width: 0, height: 0 },
      strategy: 'transform-preview',
      timestamp: 5678,
    });
    expect(result!.primaryInteraction).not.toHaveProperty('extra');
  });

  it('keeps old css debug payloads compatible when interactions are omitted', () => {
    const result = normalizeCssDebugPayload({
      originalStyles: { padding: '8px' },
      previewStyles: { padding: '12px' },
      changedStyles: {
        padding: {
          originalValue: '8px',
          previewValue: '12px',
        },
      },
    }, makeSelection());

    expect(result).toBeDefined();
    expect(result!.interactions).toBeUndefined();
    expect(result!.primaryInteraction).toBeUndefined();
  });

  it('normalizes reorder interactions and keeps reorder-only targets', () => {
    const selection = makeSelection({
      id: 'sel-reorder',
      dom: {
        ...makeSelection().dom,
        selector: '.nav-item:nth-child(1)',
        tagName: 'button',
        className: 'nav-item',
        text: 'Assets',
      },
    });
    const reorder = {
      type: 'reorder',
      handle: 'move',
      properties: ['transform'],
      rectBefore: { x: 10, y: 20, width: 80, height: 30 },
      rectAfter: { x: 100, y: 20, width: 80, height: 30 },
      delta: { x: 0, y: 0, width: 0, height: 0 },
      strategy: 'swap-sibling',
      timestamp: 1234,
      reorder: {
        sourceId: 'css-el-1',
        targetId: 'css-el-2',
        sourceIndex: 0,
        targetIndex: 1,
        parentSelector: '.nav-list',
        matchedBy: ['same-parent', 'tag:button', 'class:nav-item', 'size', 'role', 'text', 'extra-1', 'extra-2', 'extra-3'],
      },
    };

    const result = normalizeCssDebugPayload({
      batch: true,
      primaryTargetId: 'css-el-1',
      changedTargetCount: 1,
      targets: [{
        id: 'css-el-1',
        selection,
        selectedElement: selection.dom,
        changedStyles: {},
        interactions: [reorder],
        primaryInteraction: reorder,
      }],
    }, selection);

    expect(result).toBeDefined();
    expect(result!.targets).toHaveLength(1);
    expect(result!.targets![0].changedStyles).toEqual({});
    expect(result!.targets![0].primaryInteraction?.type).toBe('reorder');
    expect(result!.targets![0].primaryInteraction?.strategy).toBe('swap-sibling');
    expect(result!.targets![0].primaryInteraction?.reorder).toMatchObject({
      sourceId: 'css-el-1',
      targetId: 'css-el-2',
      sourceIndex: 0,
      targetIndex: 1,
      parentSelector: '.nav-list',
    });
    expect(result!.targets![0].primaryInteraction?.reorder?.matchedBy).toHaveLength(8);
  });

  it('normalizes group-scale interactions and keeps group-scale-only targets', () => {
    const selection = makeSelection({
      id: 'sel-scale',
      dom: {
        ...makeSelection().dom,
        selector: '.facility-map',
        tagName: 'section',
        className: 'facility-map',
        text: 'Facility map',
      },
    });
    const childEffects = Array.from({ length: 25 }, (_, index) => ({
      selector: `.zone-${index}`,
      tagName: 'div',
      beforeRect: { x: index * 10, y: 20, width: 80, height: 40 },
      afterRect: { x: index * 12, y: 24, width: 96, height: 48 },
    }));
    const groupScale = {
      type: 'group-scale',
      handle: 'se',
      properties: ['width', 'height'],
      rectBefore: { x: 10, y: 20, width: 400, height: 240 },
      rectAfter: { x: 10, y: 20, width: 520, height: 300 },
      delta: { x: 0, y: 0, width: 120, height: 60 },
      strategy: 'group-scale',
      timestamp: 1234,
      groupScale: {
        scaleX: 1.3,
        scaleY: 1.25,
        origin: 'center',
        affectedChildren: 25,
        childEffects,
      },
    };

    const result = normalizeCssDebugPayload({
      batch: true,
      primaryTargetId: 'css-el-map',
      changedTargetCount: 1,
      targets: [{
        id: 'css-el-map',
        selection,
        selectedElement: selection.dom,
        changedStyles: {},
        interactions: [groupScale],
        primaryInteraction: groupScale,
      }],
    }, selection);

    expect(result).toBeDefined();
    expect(result!.targets).toHaveLength(1);
    expect(result!.targets![0].changedStyles).toEqual({});
    expect(result!.targets![0].primaryInteraction?.type).toBe('group-scale');
    expect(result!.targets![0].primaryInteraction?.strategy).toBe('group-scale');
    expect(result!.targets![0].primaryInteraction?.groupScale).toMatchObject({
      scaleX: 1.3,
      scaleY: 1.25,
      origin: 'center',
      affectedChildren: 25,
    });
    expect(result!.targets![0].primaryInteraction?.groupScale?.childEffects).toHaveLength(20);
  });

  it('returns undefined for missing css debug payload', () => {
    expect(normalizeCssDebugPayload(undefined, makeSelection())).toBeUndefined();
  });

  it('preserves valid styleSourceHints in css debug payload', () => {
    const result = normalizeCssDebugPayload({
      originalStyles: { padding: '8px' },
      previewStyles: { padding: '16px' },
      changedStyles: { padding: { originalValue: '8px', previewValue: '16px' } },
      styleSourceHints: [{
        id: 'hint-1',
        targetId: 'css-el-1',
        kind: 'vue-sfc-style-rule',
        file: 'src/App.vue',
        line: 42,
        matchedBy: ['class:brand-icon', 'property:width'],
        properties: ['width'],
        confidence: 0.9,
        reason: 'Rule matches.',
      }],
    }, makeSelection());

    expect(result).toBeDefined();
    expect(result!.styleSourceHints).toBeDefined();
    expect(result!.styleSourceHints).toHaveLength(1);
    expect(result!.styleSourceHints![0]).toMatchObject({
      id: 'hint-1',
      targetId: 'css-el-1',
      kind: 'vue-sfc-style-rule',
      file: 'src/App.vue',
      line: 42,
      confidence: 0.9,
    });
  });

  it('drops invalid styleSourceHints', () => {
    const result = normalizeCssDebugPayload({
      originalStyles: { padding: '8px' },
      previewStyles: { padding: '16px' },
      changedStyles: { padding: { originalValue: '8px', previewValue: '16px' } },
      styleSourceHints: [
        { id: 'hint-1', targetId: '', kind: 'vue-sfc-style-rule', file: 'src/App.vue', matchedBy: [], properties: [], confidence: 0.9, reason: '' },
        { id: 'hint-2', targetId: 'css-el-1', kind: 'invalid-kind', file: 'src/App.vue', matchedBy: [], properties: [], confidence: 0.9, reason: '' },
        { id: 'hint-3', targetId: 'css-el-1', kind: 'style-rule', file: '', matchedBy: [], properties: [], confidence: 0.9, reason: '' },
        'not-an-object',
        null,
      ],
    }, makeSelection());

    expect(result).toBeDefined();
    expect(result!.styleSourceHints).toBeUndefined();
  });

  it('loads old cssDebug payloads without styleSourceHints', () => {
    const result = normalizeCssDebugPayload({
      originalStyles: { padding: '8px' },
      previewStyles: { padding: '12px' },
      changedStyles: { padding: { originalValue: '8px', previewValue: '12px' } },
    }, makeSelection());

    expect(result).toBeDefined();
    expect(result!.styleSourceHints).toBeUndefined();
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

  it('preserves recognized framework strings', () => {
    const sel = makeSelection({ framework: 'react' });
    expect(normalizeSelection(sel).framework).toBe('react');
  });

  it('defaults missing framework to dom', () => {
    const sel = makeSelection() as unknown as Record<string, unknown>;
    delete sel.framework;
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

  it('stores css debug payload on the session and selection response', () => {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    try {
      const state = new ServerState();
      const sel = makeSelection({ source: { root: FIXTURE_DIR, file: 'App.vue', line: 1, column: null } });
      state.setProjectRoot(FIXTURE_DIR);
      const cssDebug = normalizeCssDebugPayload({
        originalStyles: { 'border-radius': '4px' },
        previewStyles: { 'border-radius': '12px' },
        changedStyles: {
          'border-radius': {
            originalValue: '4px',
            previewValue: '12px',
          },
        },
      }, sel);

      state.currentSelection = sel;
      state.currentSelectionReceivedAt = Date.now();
      upsertSessionFromSelection(sel, state, undefined, 'css-debug', undefined, cssDebug);

      const session = state.sessions.get('sess-1');
      expect(session).toBeDefined();
      expect(session!.mode).toBe('css-debug');
      expect(session!.cssDebug!.changedStyles['border-radius']).toEqual({ originalValue: '4px', previewValue: '12px' });

      const response = selectionResponse(state);
      expect(response.active).toBe(true);
      expect(response.session!.mode).toBe('css-debug');
      expect(response.session!.cssDebug!.previewStyles['border-radius']).toBe('12px');
    } finally {
      rmSync(FIXTURE_DIR, { recursive: true, force: true });
    }
  });

  it('clears stale css debug payload when a session is updated without css debug data', () => {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    try {
      const state = new ServerState();
      const sel = makeSelection({ source: { root: FIXTURE_DIR, file: 'App.vue', line: 1, column: null } });
      state.setProjectRoot(FIXTURE_DIR);
      const cssDebug = normalizeCssDebugPayload({
        originalStyles: { padding: '8px' },
        previewStyles: { padding: '16px' },
        changedStyles: {
          padding: {
            originalValue: '8px',
            previewValue: '16px',
          },
        },
      }, sel);

      upsertSessionFromSelection(sel, state, undefined, 'css-debug', undefined, cssDebug);
      expect(state.sessions.get('sess-1')!.cssDebug).toBeDefined();

      upsertSessionFromSelection(makeSelection({ instruction: 'ordinary selection' }), state, undefined, 'single');
      expect(state.sessions.get('sess-1')!.mode).toBe('single');
      expect(state.sessions.get('sess-1')!.cssDebug).toBeUndefined();
    } finally {
      rmSync(FIXTURE_DIR, { recursive: true, force: true });
    }
  });

  it('accepts 8-direction resize handles in css debug interactions', () => {
    const sel = makeSelection();
    const allHandles = ['e', 's', 'se', 'nw', 'n', 'ne', 'w', 'sw', 'move'];
    for (const handle of allHandles) {
      const result = normalizeCssDebugPayload({
        interactions: [{
          type: handle === 'move' ? 'move' : 'resize',
          handle,
          properties: ['width'],
          rectBefore: { x: 0, y: 0, width: 100, height: 50 },
          rectAfter: { x: 0, y: 0, width: 120, height: 50 },
          delta: { x: 0, y: 0, width: 20, height: 0 },
          strategy: 'inline-style',
          timestamp: Date.now(),
        }],
      }, sel);
      expect(result!.interactions![0].handle).toBe(handle);
    }
  });

  it('stores session.targets derived from cssDebug.targets when body.targets is absent', () => {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    try {
      const state = new ServerState();
      const sel = makeSelection({ source: { root: FIXTURE_DIR, file: 'App.vue', line: 1, column: null } });
      state.setProjectRoot(FIXTURE_DIR);
      const cssDebug = normalizeCssDebugPayload({
        batch: true,
        changedTargetCount: 2,
        primaryTargetId: 'css-el-1',
        originalStyles: { padding: '8px' },
        previewStyles: { padding: '16px' },
        changedStyles: { padding: { originalValue: '8px', previewValue: '16px' } },
        targets: [
          {
            id: 'css-el-1',
            selectedElement: { selector: 'button.btn', tagName: 'button' },
            originalStyles: { padding: '8px' },
            previewStyles: { padding: '16px' },
            changedStyles: { padding: { originalValue: '8px', previewValue: '16px' } },
          },
          {
            id: 'css-el-2',
            selectedElement: { selector: 'h1', tagName: 'h1' },
            originalStyles: { 'font-size': '24px' },
            previewStyles: { 'font-size': '32px' },
            changedStyles: { 'font-size': { originalValue: '24px', previewValue: '32px' } },
          },
        ],
        session: { id: 'sess-1', root: FIXTURE_DIR, url: 'http://localhost:5173', title: 'Test Page', timestamp: Date.now() },
      }, sel);

      const targetsFromCssDebug = (cssDebug!.targets ?? []).map((t) => ({
        id: t.id,
        note: '',
        selection: sel,
        cssDebug: t,
      }));
      const derivedTargets = normalizeTargets(targetsFromCssDebug, sel);
      expect(derivedTargets).toHaveLength(2);
      expect(derivedTargets[0].id).toBe('css-el-1');
      expect(derivedTargets[1].id).toBe('css-el-2');

      upsertSessionFromSelection(sel, state, derivedTargets, 'css-debug', undefined, cssDebug);
      const session = state.sessions.get('sess-1');
      expect(session).toBeDefined();
      expect(session!.targets).toHaveLength(2);
      expect(session!.targets[0].id).toBe('css-el-1');
      expect(session!.targets[1].id).toBe('css-el-2');
      expect(session!.cssDebug!.changedTargetCount).toBe(2);
    } finally {
      rmSync(FIXTURE_DIR, { recursive: true, force: true });
    }
  });

  describe('scopeGuard', () => {
    it('normalizes scopeGuard on css debug payload', () => {
      const result = normalizeCssDebugPayload({
        originalStyles: { padding: '8px' },
        previewStyles: { padding: '16px' },
        changedStyles: { padding: { originalValue: '8px', previewValue: '16px' } },
        scopeGuard: {
          enabled: true,
          boundaryType: 'component',
          boundarySelector: '.login-form',
          componentName: 'LoginForm',
          rect: { x: 0, y: 0, width: 400, height: 500 },
          clamped: false,
        },
      }, makeSelection());

      expect(result).toBeDefined();
      expect(result!.scopeGuard).toBeDefined();
      expect(result!.scopeGuard!.enabled).toBe(true);
      expect(result!.scopeGuard!.boundaryType).toBe('component');
      expect(result!.scopeGuard!.boundarySelector).toBe('.login-form');
      expect(result!.scopeGuard!.componentName).toBe('LoginForm');
      expect(result!.scopeGuard!.rect).toEqual({ x: 0, y: 0, width: 400, height: 500 });
    });

    it('normalizes scopeGuard on per-target data', () => {
      const result = normalizeCssDebugPayload({
        originalStyles: { padding: '8px' },
        previewStyles: { padding: '16px' },
        changedStyles: { padding: { originalValue: '8px', previewValue: '16px' } },
        targets: [{
          id: 'target-1',
          selectedElement: { selector: 'button', tagName: 'button', id: '', className: '', text: 'Go', outerHtml: '<button>Go</button>', rect: { x: 0, y: 0, width: 80, height: 30 }, styles: {} },
          originalStyles: { padding: '8px' },
          previewStyles: { padding: '16px' },
          changedStyles: { padding: { originalValue: '8px', previewValue: '16px' } },
          scopeGuard: {
            enabled: true,
            boundaryType: 'container',
            boundarySelector: '.card',
            rect: { x: 0, y: 0, width: 300, height: 200 },
            clamped: true,
            clampReason: 'exceeded container boundary',
          },
        }],
      }, makeSelection());

      expect(result).toBeDefined();
      expect(result!.targets).toHaveLength(1);
      expect(result!.targets![0].scopeGuard).toBeDefined();
      expect(result!.targets![0].scopeGuard!.boundaryType).toBe('container');
      expect(result!.targets![0].scopeGuard!.clamped).toBe(true);
      expect(result!.targets![0].scopeGuard!.clampReason).toBe('exceeded container boundary');
    });

    it('normalizes clamped and clampDelta on interactions', () => {
      const result = normalizeCssDebugPayload({
        originalStyles: { padding: '8px' },
        previewStyles: { padding: '16px' },
        changedStyles: { padding: { originalValue: '8px', previewValue: '16px' } },
        interactions: [{
          type: 'move',
          handle: 'move',
          properties: ['transform'],
          rectBefore: { x: 10, y: 20, width: 80, height: 30 },
          rectAfter: { x: 0, y: 20, width: 80, height: 30 },
          delta: { x: 50, y: 0, width: 0, height: 0 },
          strategy: 'transform-preview',
          timestamp: 1234,
          clamped: true,
          clampDelta: { x: -40, y: 0, width: 0, height: 0 },
        }],
      }, makeSelection());

      expect(result).toBeDefined();
      expect(result!.interactions).toHaveLength(1);
      expect(result!.interactions![0].clamped).toBe(true);
      expect(result!.interactions![0].clampDelta).toEqual({ x: -40, y: 0, width: 0, height: 0 });
    });

    it('old payload without scopeGuard still normalizes correctly', () => {
      const result = normalizeCssDebugPayload({
        originalStyles: { padding: '8px' },
        previewStyles: { padding: '12px' },
        changedStyles: { padding: { originalValue: '8px', previewValue: '12px' } },
      }, makeSelection());

      expect(result).toBeDefined();
      expect(result!.scopeGuard).toBeUndefined();
      expect(result!.interactions).toBeUndefined();
    });

    it('ignores scopeGuard with enabled=false', () => {
      const result = normalizeCssDebugPayload({
        originalStyles: { padding: '8px' },
        previewStyles: { padding: '16px' },
        changedStyles: { padding: { originalValue: '8px', previewValue: '16px' } },
        scopeGuard: {
          enabled: false,
          boundaryType: 'component',
          boundarySelector: '.login',
          rect: { x: 0, y: 0, width: 400, height: 500 },
        },
      }, makeSelection());

      expect(result).toBeDefined();
      expect(result!.scopeGuard).toBeUndefined();
    });

    it('defaults boundaryType to parent for invalid values', () => {
      const result = normalizeCssDebugPayload({
        originalStyles: { padding: '8px' },
        previewStyles: { padding: '16px' },
        changedStyles: { padding: { originalValue: '8px', previewValue: '16px' } },
        scopeGuard: {
          enabled: true,
          boundaryType: 'invalid',
          boundarySelector: '.x',
          rect: { x: 0, y: 0, width: 100, height: 100 },
        },
      }, makeSelection());

      expect(result).toBeDefined();
      expect(result!.scopeGuard!.boundaryType).toBe('parent');
    });
  });
});
