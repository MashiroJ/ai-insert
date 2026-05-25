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

  it('produces parseable JavaScript', () => {
    const result = clientSource({ daemonUrl: 'http://127.0.0.1:17321', root: '/project' });
    expect(() => new Function(result)).not.toThrow();
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
    expect(result).toContain('ui-inspect-css-selection-overlay');
    expect(result).toContain('ui-inspect-css-boundary-overlay');
    expect(result).toContain('ui-inspect-css-preview-overlay');
    expect(result).toContain('ui-inspect-css-pick-popover');
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

  it('keeps CSS debug target picking explicit', () => {
    expect(src).toContain("pickMode: 'replace'");
    expect(src).toContain("cssDebugSession.pickMode = 'append'");
    expect(src).toContain("cssDebugSession.pickMode = 'replace-now'");
    expect(src).toContain('openCssDebugPickPopover');
    expect(src).toContain('data-pick-action="add"');
    expect(src).toContain('data-pick-action="replace"');
    expect(src).toContain('cssDebugSmartTargetElement');
    expect(src).toContain('ownerSVGElement');
  });

  it('uses separate CSS debug selection and boundary overlays', () => {
    expect(src).toContain('CSS_DEBUG_BOUNDARY_OVERLAY_ID');
    expect(src).toContain('updateCssDebugBoundaryOverlay');
    expect(src).toContain('removeCssDebugPreviewOverlay');
    expect(src).toContain('ui-inspect-css-runtime-style');
  });

  it('keeps reorder swap from leaking drag preview styles', () => {
    expect(src).toContain('inlineCssTextBeforeDrag');
    expect(src).toContain('previewStylesBeforeDrag');
    expect(src).toContain('activePropertiesBeforeDrag');
    expect(src).toContain("document.createComment('ui-inspect-swap')");
    expect(src).toContain("strategy: 'swap-sibling'");
    expect(src).toContain('function cssDebugElementStableId(el)');
    expect(src).toContain('return cssDebugElementKey(el);');
    expect(src).not.toContain("document.createElement('_ui-inspect-swap')");
  });
});

describe('CSS Debug Interaction V2: strategy values', () => {
  const src = clientSource({ daemonUrl: 'http://127.0.0.1:17321', root: '/project' });

  it('uses only valid strategy values: transform-preview, inline-style, group-scale, swap-sibling', () => {
    // These valid strategies must be present in the interaction source
    expect(src).toContain("interactionStrategy = 'transform-preview'");
    expect(src).toContain("interactionStrategy = 'inline-style'");
    expect(src).toContain("interactionStrategy = 'group-scale'");
    expect(src).toContain("strategy: 'swap-sibling'");
  });

  it('does NOT use illegal strategy values (transform, dimension)', () => {
    // Old illegal values should not appear in strategy assignments
    const strategyTransformMatch = src.match(/interactionStrategy\s*=\s*['"]transform['"]/);
    const strategyDimensionMatch = src.match(/interactionStrategy\s*=\s*['"]dimension['"]/);
    expect(strategyTransformMatch).toBeNull();
    expect(strategyDimensionMatch).toBeNull();
  });

  it('sets type=group-scale and strategy=group-scale together for group scale interactions', () => {
    expect(src).toContain("interactionType = 'group-scale'");
    expect(src).toContain("interactionStrategy = 'group-scale'");
    expect(src).toContain("type: interactionType");
    expect(src).toContain("strategy: interactionStrategy");
  });

  it('attaches clamped, clampDelta, scopeGuard to interaction objects', () => {
    // Regular move/resize interaction should carry clamped/clampDelta/scopeGuard
    expect(src).toContain('clamped: !!drag.clamped');
    expect(src).toContain('clampDelta: drag.clampDelta || undefined');
    expect(src).toContain('scopeGuard: drag.scopeGuard || undefined');
  });

  it('attaches groupScale info to the interaction object', () => {
    expect(src).toContain('interaction.groupScale = drag._lastGroupScaleInfo');
  });

  it('reads groupScale from interaction for payload (not recomputing)', () => {
    expect(src).toContain('function cssDebugGroupScaleForTarget(target)');
    expect(src).toContain('pi.groupScale');
  });

  it('resets group scale on single target reset', () => {
    const resetFnIdx = src.indexOf('function resetCssDebugPreview()');
    const resetBody = src.substring(resetFnIdx, resetFnIdx + 500);
    expect(resetBody).toContain('resetCssDebugGroupScale(target)');
  });

  it('resets group scale on reset all targets', () => {
    const resetFnIdx = src.indexOf('function resetAllCssDebugTargets()');
    const resetBody = src.substring(resetFnIdx, resetFnIdx + 500);
    expect(resetBody).toContain('resetCssDebugGroupScale(target)');
  });

  it('resets group scale on interaction cancel', () => {
    const cancelIdx = src.indexOf('function cancelCssDebugInteraction');
    expect(cancelIdx).toBeGreaterThan(-1);
    // finishCssDebugInteraction(true) calls resetCssDebugGroupScale when cancelled
    const finishFnIdx = src.indexOf('function finishCssDebugInteraction');
    const finishBody = src.substring(finishFnIdx, finishFnIdx + 800);
    expect(finishBody).toContain('if (cancelled)');
    expect(finishBody).toContain('resetCssDebugGroupScale(target)');
  });

  it('resets group scale on group scale toggle off', () => {
    // The toggle-group-scale checkbox handler should call resetCssDebugGroupScale
    const toggleIdx = src.indexOf("data-action=\"toggle-group-scale\"]').addEventListener('change'");
    expect(toggleIdx).toBeGreaterThan(-1);
    const toggleBlock = src.substring(toggleIdx, toggleIdx + 1200);
    expect(toggleBlock).toContain('resetCssDebugGroupScale(target)');
  });

  it('auto-creates group scale snapshot on resize begin when session enabled', () => {
    const beginFnIdx = src.indexOf('function beginCssDebugInteraction');
    const beginBody = src.substring(beginFnIdx, beginFnIdx + 1500);
    expect(beginBody).toContain('groupScaleEnabled && handle !== \'move\' && !target._groupScaleSnapshot');
    expect(beginBody).toContain('beginCssDebugGroupScaleSnapshot(target)');
  });

  it('page click uses preventDefault+stopPropagation when handled', () => {
    const clickFnIdx = src.indexOf('function handleCssDebugPageClick');
    const clickBody = src.substring(clickFnIdx, clickFnIdx + 1200);
    expect(clickBody).toContain('event.preventDefault()');
    expect(clickBody).toContain('event.stopPropagation()');
  });

  it('page click ignores overlay, own nodes, and post-drag clicks', () => {
    const clickFnIdx = src.indexOf('function handleCssDebugPageClick');
    const clickBody = src.substring(clickFnIdx, clickFnIdx + 1200);
    expect(clickBody).toContain('_pendingDragUp');
    expect(clickBody).toContain('isOwnNode(element)');
    expect(clickBody).toContain('CSS_DEBUG_OVERLAY_ID');
  });

  it('groupScale childEffects uses beforeRect/afterRect (protocol field names)', () => {
    expect(src).toContain('beforeRect:');
    expect(src).toContain('afterRect:');
    // The group scale source should not use rectBefore/rectAfter in childEffects
    // (interaction objects still use rectBefore/rectAfter which is correct)
    const gsIdx = src.indexOf('function applyCssDebugGroupScale');
    const gsBody = src.substring(gsIdx, gsIdx + 3000);
    expect(gsBody).toContain('beforeRect:');
    expect(gsBody).toContain('afterRect:');
    expect(gsBody).not.toContain('rectBefore:');
    expect(gsBody).not.toContain('rectAfter:');
  });

  it('groupScale origin is a protocol string, not an object', () => {
    expect(src).toContain("origin: 'top-left'");
    expect(src).not.toMatch(/origin:\s*\{/);
  });

  it('left/top resize handles use transform-preview strategy', () => {
    const finishFnIdx = src.indexOf('function finishCssDebugInteraction');
    const finishBody = src.substring(finishFnIdx, finishFnIdx + 6000);
    expect(finishBody).toContain('resizeAffectsLeft');
    expect(finishBody).toContain('resizeAffectsTop');
    expect(finishBody).toContain("drag.handle === 'move' || resizeAffectsLeft || resizeAffectsTop");
    expect(finishBody).toContain("interactionStrategy = 'transform-preview'");
  });
});
