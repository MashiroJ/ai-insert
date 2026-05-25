import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildCssDebugStyleSourceHints } from './style-source-hints.js';
import type { UiInspectCssDebugPayload, UiInspectCssDebugTarget, UiInspectSelection } from '@ui-inspect/protocol';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const FIXTURE_DIR = join(tmpdir(), 'ui-inspect-style-source-hints-test');

function makeSelection(overrides: Partial<UiInspectSelection> = {}): UiInspectSelection {
  return {
    id: 'sel-1',
    sessionId: 'sess-1',
    url: 'http://localhost:5173',
    title: 'Test Page',
    timestamp: Date.now(),
    instruction: 'fix the logo',
    framework: 'vue3',
    dom: {
      selector: '.brand-icon img',
      tagName: 'img',
      id: '',
      className: 'brand-icon',
      text: '',
      outerHtml: '<img class="brand-icon">',
      rect: { x: 10, y: 20, width: 140, height: 140 },
      styles: { width: '140px', height: '140px' },
    },
    source: { root: FIXTURE_DIR, file: 'src/views/Login.vue', line: 50, column: 5 },
    ...overrides,
  };
}

function makeTarget(overrides: Partial<UiInspectCssDebugTarget> = {}): UiInspectCssDebugTarget {
  const selection = makeSelection();
  return {
    id: 'css-el-1',
    selection,
    selectedElement: selection.dom,
    originalStyles: { width: '140px', height: '140px' },
    previewStyles: { width: '60px', height: '66px' },
    changedStyles: {
      width: { originalValue: '140px', previewValue: '60px' },
      height: { originalValue: '140px', previewValue: '66px' },
    },
    ...overrides,
  };
}

function makePayload(overrides: Partial<UiInspectCssDebugPayload> = {}): UiInspectCssDebugPayload {
  const selection = makeSelection();
  return {
    selection,
    selectedElement: selection.dom,
    originalStyles: { width: '140px', height: '140px' },
    previewStyles: { width: '60px', height: '66px' },
    changedStyles: {
      width: { originalValue: '140px', previewValue: '60px' },
      height: { originalValue: '140px', previewValue: '66px' },
    },
    targets: [makeTarget()],
    session: { id: 'sess-1', url: 'http://localhost:5173', title: 'Test Page', root: FIXTURE_DIR, timestamp: Date.now() },
    ...overrides,
  };
}

const VUE_SFC_CONTENT = `<template>
  <div class="login-page">
    <div class="login-left">
      <div class="brand-icon">
        <img class="brand-icon" src="/logo.png" alt="Logo" />
      </div>
    </div>
    <div class="login-right">
      <h1>Welcome</h1>
    </div>
  </div>
</template>

<script setup>
export default { name: 'Login' }
</script>

<style scoped>
.login-page {
  display: flex;
  height: 100vh;
}
.login-left {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
.brand-icon img {
  width: 140px;
  height: 140px;
  border-radius: 8px;
}
.brand-icon {
  margin-bottom: 24px;
}
.login-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
`;

const CSS_FILE_CONTENT = `.brand-icon img {
  width: 140px;
  height: 140px;
  border-radius: 8px;
}

.login-left {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}
`;

describe('buildCssDebugStyleSourceHints', () => {
  beforeEach(() => {
    mkdirSync(join(FIXTURE_DIR, 'src/views'), { recursive: true });
    writeFileSync(join(FIXTURE_DIR, 'src/views/Login.vue'), VUE_SFC_CONTENT);
    writeFileSync(join(FIXTURE_DIR, 'src/views/Login.css'), CSS_FILE_CONTENT);
  });

  afterEach(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  it('finds .brand-icon img style rule with width/height diff', () => {
    const payload = makePayload();
    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });

    expect(result.targets![0].styleSourceHints).toBeDefined();
    expect(result.targets![0].styleSourceHints!.length).toBeGreaterThan(0);

    const topHint = result.targets![0].styleSourceHints![0];
    expect(topHint.selector).toContain('brand-icon');
    expect(topHint.confidence).toBeGreaterThanOrEqual(0.82);
    expect(topHint.kind).toBe('vue-sfc-style-rule');
    expect(topHint.file).toContain('Login.vue');
  });

  it('returns parent-layout hint for drag-only transform', () => {
    const selection = makeSelection();
    const target = makeTarget({
      selectedElement: {
        ...selection.dom,
        className: 'brand-icon',
        tagName: 'img',
      },
      changedStyles: {
        transform: { originalValue: 'none', previewValue: 'translate(-153px, -127px)' },
      },
      primaryInteraction: {
        type: 'move',
        handle: 'move',
        properties: ['transform'],
        rectBefore: { x: 10, y: 20, width: 140, height: 140 },
        rectAfter: { x: -143, y: -107, width: 140, height: 140 },
        delta: { x: -153, y: -127, width: 0, height: 0 },
        strategy: 'transform-preview',
        timestamp: Date.now(),
      },
      layoutContext: {
        parent: {
          selector: '.login-left',
          tagName: 'div',
          className: 'login-left',
          text: '',
          rect: { x: 0, y: 0, width: 600, height: 800 },
          styles: { display: 'flex', 'justify-content': 'center', 'align-items': 'center' },
        },
        siblings: [],
        children: [],
      },
    });

    const payload = makePayload({ targets: [target] });
    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });

    expect(result.targets![0].styleSourceHints).toBeDefined();
    const hints = result.targets![0].styleSourceHints!;
    const parentHint = hints.find((h) => h.kind === 'parent-layout-rule');
    expect(parentHint).toBeDefined();
    expect(parentHint!.selector).toContain('login-left');
  });

  it('returns fallback-source hint when no matching style rule', () => {
    writeFileSync(join(FIXTURE_DIR, 'src/views/Empty.vue'), '<template><div class="no-classes"></div></template>');
    const selection = makeSelection({ source: { root: FIXTURE_DIR, file: 'src/views/Empty.vue', line: 1, column: 1 } });
    const target = makeTarget({
      selection,
      selectedElement: {
        selector: '.no-classes',
        tagName: 'div',
        id: '',
        className: 'no-classes',
        text: '',
        outerHtml: '<div class="no-classes"></div>',
        rect: { x: 0, y: 0, width: 100, height: 100 },
        styles: {},
      },
    });
    const payload = makePayload({ targets: [target], selection });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    const hints = result.targets![0].styleSourceHints;
    expect(hints).toBeDefined();
    expect(hints!.some((h) => h.kind === 'fallback-source')).toBe(true);
  });

  it('does not throw for missing file', () => {
    const selection = makeSelection({ source: { root: FIXTURE_DIR, file: 'src/views/NonExistent.vue', line: 1, column: 1 } });
    const target = makeTarget({ selection });
    const payload = makePayload({ targets: [target], selection });

    expect(() => buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload })).not.toThrow();
  });

  it('ignores file outside project root', () => {
    const selection = makeSelection({ source: { root: FIXTURE_DIR, file: '/etc/passwd', line: 1, column: 1 } });
    const target = makeTarget({ selection });
    const payload = makePayload({ targets: [target], selection });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    const hints = result.targets![0].styleSourceHints;
    expect(hints === undefined || hints!.length === 0).toBe(true);
  });

  it('rejects sibling path like /tmp/app-other/file.vue when root is /tmp/app', () => {
    const siblingDir = FIXTURE_DIR + '-other';
    const selection = makeSelection({ source: { root: FIXTURE_DIR, file: siblingDir + '/src/views/Login.vue', line: 1, column: 1 } });
    const target = makeTarget({ selection });
    const payload = makePayload({ targets: [target], selection });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    const hints = result.targets![0].styleSourceHints;
    expect(hints === undefined || hints!.length === 0).toBe(true);
  });

  it('extracts parent classes from parentChain attributes', () => {
    const selection = makeSelection({
      context: {
        parentChain: [
          { tagName: 'div', attributes: { class: 'login-left' } },
          { tagName: 'div', attributes: { class: 'login-page' } },
        ],
      },
    });
    const target = makeTarget({
      selection,
      selectedElement: {
        selector: 'div.login-left img.brand-icon',
        tagName: 'img',
        id: '',
        className: 'brand-icon',
        text: '',
        outerHtml: '<img class="brand-icon">',
        rect: { x: 0, y: 0, width: 140, height: 140 },
        styles: {},
      },
      layoutContext: {
        parent: {
          selector: 'div.login-left',
          tagName: 'div',
          className: 'login-left',
          text: '',
          rect: { x: 0, y: 0, width: 600, height: 800 },
          styles: { display: 'flex' },
        },
        siblings: [],
        children: [],
      },
    });
    const payload = makePayload({ targets: [target], selection });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    const hints = result.targets![0].styleSourceHints;
    expect(hints).toBeDefined();
    expect(hints!.length).toBeGreaterThan(0);
    // Should find both .brand-icon img and .login-left
    const selectors = hints!.map((h) => h.selector);
    expect(selectors.some((s) => s?.includes('login-left'))).toBe(true);
  });

  it('caps hints per target', () => {
    const payload = makePayload();
    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload, maxHintsPerTarget: 2 });

    if (result.targets![0].styleSourceHints) {
      expect(result.targets![0].styleSourceHints.length).toBeLessThanOrEqual(2);
    }
  });

  it('caps total hints', () => {
    const t1 = makeTarget({ id: 'css-el-1' });
    const t2 = makeTarget({ id: 'css-el-2' });
    const payload = makePayload({ targets: [t1, t2] });
    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload, maxTotalHints: 3 });

    const total = (result.styleSourceHints ?? []).length;
    expect(total).toBeLessThanOrEqual(3);
  });

  it('returns hints grouped by target id in multi-target payload', () => {
    const sel1 = makeSelection({ id: 'sel-1' });
    const sel2 = makeSelection({ id: 'sel-2' });
    const t1 = makeTarget({ id: 'css-el-1', selection: sel1, selectedElement: sel1.dom });
    const t2 = makeTarget({ id: 'css-el-2', selection: sel2, selectedElement: sel2.dom });
    const payload = makePayload({ targets: [t1, t2] });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });

    for (const target of result.targets ?? []) {
      if (target.styleSourceHints) {
        for (const hint of target.styleSourceHints) {
          expect(hint.targetId).toBe(target.id);
        }
      }
    }
  });

  it('scans plain CSS files', () => {
    const selection = makeSelection({ source: { root: FIXTURE_DIR, file: 'src/views/Login.css', line: 1, column: 1 } });
    const target = makeTarget({
      selection,
      selectedElement: {
        selector: '.brand-icon img',
        tagName: 'img',
        id: '',
        className: 'brand-icon',
        text: '',
        outerHtml: '<img class="brand-icon">',
        rect: { x: 0, y: 0, width: 140, height: 140 },
        styles: {},
      },
    });
    const payload = makePayload({ targets: [target], selection });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    const hints = result.targets![0].styleSourceHints;
    expect(hints).toBeDefined();
    expect(hints!.some((h) => h.kind === 'style-rule' && h.selector?.includes('brand-icon'))).toBe(true);
  });

  it('generates hints for old single-target payload without targets array', () => {
    const selection = makeSelection();
    // Old-style payload: no targets array, changedStyles at top level
    const payload: UiInspectCssDebugPayload = {
      selection,
      selectedElement: selection.dom,
      originalStyles: { width: '140px', height: '140px' },
      previewStyles: { width: '60px', height: '66px' },
      changedStyles: {
        width: { originalValue: '140px', previewValue: '60px' },
        height: { originalValue: '140px', previewValue: '66px' },
      },
      session: { id: 'sess-1', url: 'http://localhost:5173', title: 'Test', root: FIXTURE_DIR, timestamp: Date.now() },
    };

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    expect(result.targets).toBeDefined();
    expect(result.targets!.length).toBe(1);
    expect(result.targets![0].styleSourceHints).toBeDefined();
    expect(result.targets![0].styleSourceHints!.length).toBeGreaterThan(0);
    expect(result.styleSourceHints).toBeDefined();
    expect(result.targets![0].id).toBe('css-el-0');
  });
});
