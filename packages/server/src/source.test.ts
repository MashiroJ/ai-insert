import { describe, it, expect } from 'vitest';
import { readSelectionSource, sourceOpenCommand } from './source.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { UiInspectSelection } from '@ui-inspect/protocol';

const FIXTURE_DIR = join(tmpdir(), 'ui-inspect-source-test');

function makeSelection(root: string, file: string, line?: number): UiInspectSelection {
  return {
    id: 'test-selection',
    sessionId: 'test-session',
    url: 'http://localhost:5173',
    title: 'Test',
    timestamp: Date.now(),
    instruction: 'fix this',
    framework: 'dom',
    dom: {
      selector: 'div',
      tagName: 'div',
      id: '',
      className: '',
      text: '',
      outerHtml: '<div></div>',
      rect: { x: 0, y: 0, width: 100, height: 100 },
      styles: {},
    },
    source: { root, file, line: line ?? null, column: null },
  };
}

describe('readSelectionSource', () => {
  it('reads a file and returns source context', async () => {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    const filePath = join(FIXTURE_DIR, 'App.vue');
    writeFileSync(filePath, ['line1', 'line2', 'target-line', 'line4', 'line5'].join('\n'));
    try {
      const result = await readSelectionSource(makeSelection(FIXTURE_DIR, 'App.vue', 3), 1);
      expect(result.file).toBe('App.vue');
      expect(result.startLine).toBe(2);
      expect(result.endLine).toBe(4);
      expect(result.totalLines).toBe(5);
      expect(result.content).toContain('target-line');
    } finally {
      rmSync(FIXTURE_DIR, { recursive: true, force: true });
    }
  });

  it('throws if root is missing', async () => {
    const sel = makeSelection('', 'App.vue', 1);
    sel.source.root = null;
    await expect(readSelectionSource(sel, 5)).rejects.toThrow('no source file');
  });

  it('throws if file is missing', async () => {
    const sel = makeSelection('/tmp', '', 1);
    sel.source.file = null;
    await expect(readSelectionSource(sel, 5)).rejects.toThrow('no source file');
  });

  it('throws if file is outside root (path traversal)', async () => {
    await expect(readSelectionSource(makeSelection('/tmp', '../../../etc/passwd', 1), 5))
      .rejects.toThrow('outside root');
  });

  it('throws for non-existent file', async () => {
    await expect(readSelectionSource(makeSelection('/tmp', 'nonexistent-file-xyz.ts', 1), 5))
      .rejects.toThrow('failed to read source file');
  });

  it('defaults to line 1 when no line specified', async () => {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    const filePath = join(FIXTURE_DIR, 'default.vue');
    writeFileSync(filePath, ['first', 'second', 'third'].join('\n'));
    try {
      const result = await readSelectionSource(makeSelection(FIXTURE_DIR, 'default.vue'), 1);
      expect(result.startLine).toBe(1);
      expect(result.content).toContain('first');
    } finally {
      rmSync(FIXTURE_DIR, { recursive: true, force: true });
    }
  });
});

describe('sourceOpenCommand', () => {
  it('opens macOS system default as text file', () => {
    expect(sourceOpenCommand('open', '/tmp/App.vue', 3, 5)).toEqual({
      command: 'open',
      args: ['-t', '/tmp/App.vue'],
    });
  });

  it('opens Windows system default through cmd start', () => {
    expect(sourceOpenCommand('start', 'C:\\project\\App.vue', 3, 5)).toEqual({
      command: 'cmd.exe',
      args: ['/c', 'start', '', 'C:\\project\\App.vue'],
    });
  });

  it('opens source-aware editors with line and column target', () => {
    expect(sourceOpenCommand('code', '/tmp/App.vue', 3, 5)).toEqual({
      command: 'code',
      args: ['-g', '/tmp/App.vue:3:5'],
    });
  });
});
