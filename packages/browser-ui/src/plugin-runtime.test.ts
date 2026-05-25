import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { clientSource } from './client-source.js';
import { getDianaAssetPath } from './diana-asset.js';

describe('clientSource', () => {
  it('returns a non-empty string', () => {
    const result = clientSource({ daemonUrl: 'http://127.0.0.1:17321', root: '/project' });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(100);
  });

  it('embeds the daemon URL', () => {
    const result = clientSource({ daemonUrl: 'http://custom:9999', root: '/project' });
    expect(result).toContain('http://custom:9999');
  });

  it('embeds the project root', () => {
    const result = clientSource({ daemonUrl: 'http://127.0.0.1:17321', root: '/my/project' });
    expect(result).toContain('/my/project');
  });

  it('produces a valid IIFE', () => {
    const result = clientSource({ daemonUrl: 'http://127.0.0.1:17321', root: '/project' });
    expect(result.startsWith('(() => {')).toBe(true);
    expect(result.trimEnd().endsWith('})();')).toBe(true);
  });

  it('keeps the default Diana sprite URL', () => {
    const result = clientSource({ daemonUrl: 'http://127.0.0.1:17321', root: '/project' });
    expect(result).toContain('/@ui-inspect/diana.webp');
  });

  it('embeds a custom Diana sprite URL', () => {
    const result = clientSource({
      daemonUrl: 'http://127.0.0.1:17321',
      root: '/project',
      dianaSpriteUrl: '/api/ui-inspect/diana',
    });
    expect(result).toContain('/api/ui-inspect/diana');
    expect(result).not.toContain('/@ui-inspect/diana.webp');
  });

  it('includes the CSS debug runtime mode', () => {
    const result = clientSource({ daemonUrl: 'http://127.0.0.1:17321', root: '/project' });

    expect(result).toContain("data-mode=\"css-debug\"");
    expect(result).toContain("mode: 'css-debug'");
    expect(result).toContain('changedStyles');
    expect(result).toContain('resetCssDebugPreview');
    expect(result).toContain('ui-inspect-css-overlay');
    expect(result).toContain('primaryInteraction');
    expect(result).toContain('cssDebugSession');
    expect(result).toContain('cssDebugActiveTarget');
    expect(result).toContain('resetAllCssDebugTargets');
    expect(result).toContain('renderCssDebugTargetList');
  });
});

describe('getDianaAssetPath', () => {
  it('returns a string', () => {
    const path = getDianaAssetPath();
    expect(typeof path).toBe('string');
  });

  it('points to an existing file', () => {
    const path = getDianaAssetPath();
    expect(existsSync(path)).toBe(true);
  });

  it('points to a webp file', () => {
    const path = getDianaAssetPath();
    expect(path.endsWith('.webp')).toBe(true);
  });
});

describe('clientSource CSS debug features', () => {
  const src = clientSource({ daemonUrl: 'http://127.0.0.1:17321', root: '/project' });

  it('includes 8-direction resize handle markup', () => {
    for (const handle of ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']) {
      expect(src).toContain(`data-css-debug-handle="${handle}"`);
    }
  });

  it('includes box model visualization styles', () => {
    expect(src).toContain('ui-inspect-box-model-margin');
    expect(src).toContain('ui-inspect-box-model-padding');
  });

  it('keeps keyboard nudge properties visible in changed-only mode', () => {
    expect(src).toContain("changedOnlyProperties: ['margin-top'");
    expect(src).toContain("'padding-left']");
    expect(src).toContain("changedOnlyProperties: ['letter-spacing']");
    expect(src).toContain('...(group.changedOnlyProperties || [])');
  });

  it('renders assistant messages in the CSS debug panel after send', () => {
    const interactionIndex = src.indexOf('<div class="ui-inspect-css-interaction"><b>拖拽记录</b><span>暂无</span></div>');
    const cssNoteIndex = src.indexOf('<label class="ui-inspect-field-label" for="ui-inspect-css-note-dialog">');
    const messagesIndex = src.indexOf('<div class="ui-inspect-messages" aria-live="polite"></div>');
    expect(interactionIndex).toBeGreaterThan(-1);
    expect(messagesIndex).toBeGreaterThan(-1);
    expect(cssNoteIndex).toBeGreaterThan(-1);
  });

  it('keeps injected CSS debug clamp and sent-lock guards in sync', () => {
    expect(src).toContain('const fixedRight = elementRect.x + elementRect.width;');
    expect(src).toContain('const fixedBottom = elementRect.y + elementRect.height;');
    expect(src).toContain('clampDx = resultWidth - elementRect.width;');
    expect(src).toContain('clampDy = resultHeight - elementRect.height;');
    expect(src).toContain('CSS diff 已发送，无法再修改');
    expect(src).toContain('CSS diff 已发送，不能重复发送');
  });
});
