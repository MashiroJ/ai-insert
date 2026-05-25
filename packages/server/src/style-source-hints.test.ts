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

  // --- Vue SFC template line inference tests ---

  it('infers template line for .brand-icon img when source.line is null', () => {
    const selection = makeSelection({ source: { root: FIXTURE_DIR, file: 'src/views/Login.vue', line: null as unknown as number, column: null as unknown as number } });
    const target = makeTarget({ selection });
    const payload = makePayload({ targets: [target], selection });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    const t = result.targets![0];

    expect(t.selection.source.line).not.toBeNull();
    expect(t.selection.source.line).toBeGreaterThan(0);
    expect(t.selection.sourceHints).toBeDefined();
    const templateHint = t.selection.sourceHints!.find((h) => h.kind === 'template-file');
    expect(templateHint).toBeDefined();
    expect(templateHint!.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('does not overwrite existing non-null source.line', () => {
    const selection = makeSelection({ source: { root: FIXTURE_DIR, file: 'src/views/Login.vue', line: 99, column: 1 } });
    const target = makeTarget({ selection });
    const payload = makePayload({ targets: [target], selection });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    expect(result.targets![0].selection.source.line).toBe(99);
  });

  it('adds template-file sourceHint with matchedBy metadata', () => {
    const selection = makeSelection({ source: { root: FIXTURE_DIR, file: 'src/views/Login.vue', line: null as unknown as number, column: null as unknown as number } });
    const target = makeTarget({ selection });
    const payload = makePayload({ targets: [target], selection });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    const hint = result.targets![0].selection.sourceHints!.find((h) => h.kind === 'template-file');
    expect(hint).toBeDefined();
    expect(hint!.file).toContain('Login.vue');
    expect(hint!.metadata?.matchedBy).toBeDefined();
  });

  // --- layoutHints tests ---

  it('generates margin-left layoutHint for move in flex parent', () => {
    const selection = makeSelection();
    const target = makeTarget({
      selection,
      changedStyles: {
        transform: { originalValue: 'none', previewValue: 'translate(-50px, 0px)' },
      },
      primaryInteraction: {
        type: 'move',
        handle: 'move',
        properties: ['transform'],
        rectBefore: { x: 10, y: 20, width: 140, height: 140 },
        rectAfter: { x: -40, y: 20, width: 140, height: 140 },
        delta: { x: -50, y: 0, width: 0, height: 0 },
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
          styles: { display: 'flex' },
        },
        siblings: [],
        children: [],
      },
    });
    const payload = makePayload({ targets: [target] });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    const layoutHints = result.targets![0].layoutHints;
    expect(layoutHints).toBeDefined();
    expect(layoutHints!.length).toBeGreaterThan(0);
    expect(layoutHints![0].suggestedProperty).toBe('margin-left');
    expect(layoutHints![0].confidence).toBeGreaterThanOrEqual(0.78);
  });

  it('generates justify-self layoutHint for move in grid parent', () => {
    const selection = makeSelection();
    const target = makeTarget({
      selection,
      changedStyles: {
        transform: { originalValue: 'none', previewValue: 'translate(-50px, -30px)' },
      },
      primaryInteraction: {
        type: 'move',
        handle: 'move',
        properties: ['transform'],
        rectBefore: { x: 10, y: 20, width: 140, height: 140 },
        rectAfter: { x: -40, y: -10, width: 140, height: 140 },
        delta: { x: -50, y: -30, width: 0, height: 0 },
        strategy: 'transform-preview',
        timestamp: Date.now(),
      },
      layoutContext: {
        parent: {
          selector: '.grid-container',
          tagName: 'div',
          className: 'grid-container',
          text: '',
          rect: { x: 0, y: 0, width: 800, height: 600 },
          styles: { display: 'grid' },
        },
        siblings: [],
        children: [],
      },
    });
    const payload = makePayload({ targets: [target] });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    const layoutHints = result.targets![0].layoutHints;
    expect(layoutHints).toBeDefined();
    expect(layoutHints!.length).toBeGreaterThan(0);
    expect(layoutHints![0].suggestedProperty).toBe('justify-self');
  });

  it('generates width layoutHint for resize interaction', () => {
    const selection = makeSelection();
    const target = makeTarget({
      selection,
      changedStyles: {
        width: { originalValue: '140px', previewValue: '60px' },
      },
      primaryInteraction: {
        type: 'resize',
        handle: 'e',
        properties: ['width'],
        rectBefore: { x: 10, y: 20, width: 140, height: 140 },
        rectAfter: { x: 10, y: 20, width: 60, height: 140 },
        delta: { x: 0, y: 0, width: -80, height: 0 },
        strategy: 'inline-style',
        timestamp: Date.now(),
      },
    });
    const payload = makePayload({ targets: [target] });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    const layoutHints = result.targets![0].layoutHints;
    expect(layoutHints).toBeDefined();
    const resizeHint = layoutHints!.find((h) => h.suggestedProperty === 'width');
    expect(resizeHint).toBeDefined();
    expect(resizeHint!.confidence).toBeGreaterThanOrEqual(0.85);
  });

  // --- specificityWarnings tests ---

  it('generates specificityWarnings when multiple selectors declare same changed property', () => {
    // Create a Vue file with two rules that both declare width for overlapping selectors
    const vueContent = `<template>
  <div class="brand-icon">
    <img class="brand-icon" src="/logo.png" />
  </div>
</template>

<script setup>
</script>

<style scoped>
.brand-icon img {
  width: 140px;
  height: 140px;
}
</style>

<style>
.brand-icon img {
  width: 200px;
}
</style>
`;
    writeFileSync(join(FIXTURE_DIR, 'src/views/Conflict.vue'), vueContent);

    const selection = makeSelection({ source: { root: FIXTURE_DIR, file: 'src/views/Conflict.vue', line: 50, column: 5 } });
    const target = makeTarget({ selection });
    const payload = makePayload({ targets: [target], selection });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    const warnings = result.targets![0].specificityWarnings;
    expect(warnings).toBeDefined();
    expect(warnings!.length).toBeGreaterThan(0);
    // Should warn about scoped vs global overlap for width
    const scopedWarning = warnings!.find((w) => w.severity === 'info' && w.property === 'width');
    expect(scopedWarning).toBeDefined();
  });

  // --- Targeted fix tests ---

  it('infers template line for no-class img via parentChain parent class', () => {
    // Real logo scenario: <div class="brand-icon"><img src="/logo.png" /></div>
    // The img has no class, but parentChain contains div.brand-icon
    const selection = makeSelection({
      source: { root: FIXTURE_DIR, file: 'src/views/Login.vue', line: null as unknown as number, column: null as unknown as number },
      dom: {
        selector: 'div.brand-icon > img',
        tagName: 'img',
        id: '',
        className: '',
        text: '',
        outerHtml: '<img src="/logo.png">',
        rect: { x: 10, y: 20, width: 140, height: 140 },
        styles: { width: '140px', height: '140px' },
      },
      context: {
        parentChain: [
          { tagName: 'div', selector: 'div.brand-icon', attributes: { class: 'brand-icon' } },
        ],
      },
    });
    const target = makeTarget({
      selection,
      selectedElement: selection.dom,
      layoutContext: {
        parent: {
          selector: '.brand-icon',
          tagName: 'div',
          className: 'brand-icon',
          text: '',
          rect: { x: 0, y: 0, width: 300, height: 200 },
          styles: {},
        },
        siblings: [],
        children: [],
      },
    });
    const payload = makePayload({ targets: [target], selection });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    const t = result.targets![0];
    expect(t.selection.source.line).not.toBeNull();
    expect(t.selection.source.line).toBeGreaterThan(0);
    expect(t.selection.sourceHints).toBeDefined();
    const templateHint = t.selection.sourceHints!.find((h) => h.kind === 'template-file');
    expect(templateHint).toBeDefined();
    expect(templateHint!.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('keeps no-class img template inference scoped to the matching parent node', () => {
    const vueContent = `<template>
  <div class="hero">
    <img src="/hero.png" />
  </div>
  <div class="brand-icon">
    <img src="/logo.png" />
  </div>
</template>

<style scoped>
.brand-icon img {
  width: 140px;
  height: 140px;
}
</style>
`;
    writeFileSync(join(FIXTURE_DIR, 'src/views/AmbiguousImages.vue'), vueContent);

    const selection = makeSelection({
      source: { root: FIXTURE_DIR, file: 'src/views/AmbiguousImages.vue', line: null as unknown as number, column: null as unknown as number },
      dom: {
        selector: 'div.brand-icon > img',
        tagName: 'img',
        id: '',
        className: '',
        text: '',
        outerHtml: '<img src="/logo.png">',
        rect: { x: 10, y: 20, width: 140, height: 140 },
        styles: { width: '140px', height: '140px' },
      },
      context: {
        parentChain: [
          { tagName: 'div', selector: 'div.brand-icon', attributes: { class: 'brand-icon' } },
        ],
      },
    });
    const target = makeTarget({
      selection,
      selectedElement: selection.dom,
      layoutContext: {
        parent: {
          selector: '.brand-icon',
          tagName: 'div',
          className: 'brand-icon',
          text: '',
          rect: { x: 0, y: 0, width: 300, height: 200 },
          styles: {},
        },
        siblings: [],
        children: [],
      },
    });
    const payload = makePayload({ targets: [target], selection });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    const inferredLine = result.targets![0].selection.source.line;
    expect(inferredLine).toBe(6);
  });

  it('does not suggest left/top for position:static in layoutHints', () => {
    const selection = makeSelection();
    const target = makeTarget({
      selection,
      changedStyles: {
        transform: { originalValue: 'none', previewValue: 'translate(-50px, 0px)' },
      },
      primaryInteraction: {
        type: 'move',
        handle: 'move',
        properties: ['transform'],
        rectBefore: { x: 10, y: 20, width: 140, height: 140 },
        rectAfter: { x: -40, y: 20, width: 140, height: 140 },
        delta: { x: -50, y: 0, width: 0, height: 0 },
        strategy: 'transform-preview',
        timestamp: Date.now(),
      },
      originalStyles: { position: 'static', width: '140px', height: '140px' },
      layoutContext: {
        parent: {
          selector: '.container',
          tagName: 'div',
          className: 'container',
          text: '',
          rect: { x: 0, y: 0, width: 600, height: 800 },
          styles: { position: 'static' },
        },
        siblings: [],
        children: [],
      },
    });
    const payload = makePayload({ targets: [target] });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    const layoutHints = result.targets![0].layoutHints;
    expect(layoutHints).toBeDefined();
    // Should NOT suggest left/top since both positions are static
    const leftHint = layoutHints!.find((h) => h.suggestedProperty === 'left');
    expect(leftHint).toBeUndefined();
    // Should suggest margin-left instead
    const marginHint = layoutHints!.find((h) => h.suggestedProperty === 'margin-left');
    expect(marginHint).toBeDefined();
  });

  it('does not generate specificityWarnings for rules that do not actually declare the changed property', () => {
    // Two rules match the element but only one actually declares width
    const vueContent = `<template>
  <div class="brand-icon">
    <img class="brand-icon" src="/logo.png" />
  </div>
</template>

<script setup>
</script>

<style scoped>
.brand-icon {
  margin-bottom: 24px;
}
.brand-icon img {
  width: 140px;
  height: 140px;
}
</style>
`;
    writeFileSync(join(FIXTURE_DIR, 'src/views/NoConflict.vue'), vueContent);

    const selection = makeSelection({ source: { root: FIXTURE_DIR, file: 'src/views/NoConflict.vue', line: 50, column: 5 } });
    const target = makeTarget({ selection });
    const payload = makePayload({ targets: [target], selection });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    const warnings = result.targets![0].specificityWarnings;
    // .brand-icon does not declare width, so no false warning about width override
    const widthWarnings = (warnings ?? []).filter((w) => w.property === 'width');
    expect(widthWarnings).toHaveLength(0);
  });

  it('suggests left/top for position:relative elements in layoutHints', () => {
    const selection = makeSelection();
    const target = makeTarget({
      selection,
      changedStyles: {
        transform: { originalValue: 'none', previewValue: 'translate(-50px, 0px)' },
      },
      primaryInteraction: {
        type: 'move',
        handle: 'move',
        properties: ['transform'],
        rectBefore: { x: 10, y: 20, width: 140, height: 140 },
        rectAfter: { x: -40, y: 20, width: 140, height: 140 },
        delta: { x: -50, y: 0, width: 0, height: 0 },
        strategy: 'transform-preview',
        timestamp: Date.now(),
      },
      originalStyles: { position: 'relative', width: '140px', height: '140px' },
      layoutContext: {
        parent: {
          selector: '.container',
          tagName: 'div',
          className: 'container',
          text: '',
          rect: { x: 0, y: 0, width: 600, height: 800 },
          styles: {},
        },
        siblings: [],
        children: [],
      },
    });
    const payload = makePayload({ targets: [target] });

    const result = buildCssDebugStyleSourceHints({ projectRoot: FIXTURE_DIR, cssDebug: payload });
    const layoutHints = result.targets![0].layoutHints;
    expect(layoutHints).toBeDefined();
    const leftHint = layoutHints!.find((h) => h.suggestedProperty === 'left');
    expect(leftHint).toBeDefined();
  });
});
