// Generated browser client source fragment for CSS Debug.
export const cssDebugOverlayClientSource = `
  function removeCssDebugOverlay() {
    const overlay = document.getElementById(CSS_DEBUG_OVERLAY_ID);
    if (overlay) overlay.remove();
    const boundary = document.getElementById(CSS_DEBUG_BOUNDARY_OVERLAY_ID);
    if (boundary) boundary.remove();
    const preview = document.getElementById(CSS_DEBUG_PREVIEW_OVERLAY_ID);
    if (preview) preview.remove();
    const target = cssDebugActiveTarget();
    if (target) target.drag = null;
  }

  function removeCssDebugPreviewOverlay() {
    const preview = document.getElementById(CSS_DEBUG_PREVIEW_OVERLAY_ID);
    if (preview) preview.remove();
  }

  function ensureCssDebugOverlay() {
    let overlay = document.getElementById(CSS_DEBUG_OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = CSS_DEBUG_OVERLAY_ID;
      overlay.innerHTML = [
        '<div class="ui-inspect-box-model ui-inspect-box-model-margin"></div>',
        '<div class="ui-inspect-box-model ui-inspect-box-model-padding"></div>',
        '<button type="button" data-css-debug-handle="nw" aria-label="左上调整"></button>',
        '<button type="button" data-css-debug-handle="n" aria-label="上方调整高度"></button>',
        '<button type="button" data-css-debug-handle="ne" aria-label="右上调整"></button>',
        '<button type="button" data-css-debug-handle="w" aria-label="左侧调整宽度"></button>',
        '<button type="button" data-css-debug-handle="move" aria-label="移动选中元素"></button>',
        '<button type="button" data-css-debug-handle="e" aria-label="右侧调整宽度"></button>',
        '<button type="button" data-css-debug-handle="sw" aria-label="左下调整"></button>',
        '<button type="button" data-css-debug-handle="s" aria-label="下方调整高度"></button>',
        '<button type="button" data-css-debug-handle="se" aria-label="右下调整宽度和高度"></button>'
      ].join('');
      document.body.appendChild(overlay);
      ['pointerdown','mousedown','mouseup','click','dblclick','mousemove'].forEach((type) => {
        overlay.addEventListener(type, (event) => event.stopPropagation());
      });
      Array.from(overlay.querySelectorAll('[data-css-debug-handle]')).forEach((handle) => {
        handle.addEventListener('pointerdown', beginCssDebugInteraction);
      });
    }
    return overlay;
  }

  function ensureCssDebugBoundaryOverlay() {
    let overlay = document.getElementById(CSS_DEBUG_BOUNDARY_OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = CSS_DEBUG_BOUNDARY_OVERLAY_ID;
      document.body.appendChild(overlay);
      ['pointerdown','mousedown','mouseup','click','dblclick','mousemove'].forEach((type) => {
        overlay.addEventListener(type, (event) => event.stopPropagation());
      });
    }
    return overlay;
  }

  function updateCssDebugBoundaryOverlay(scopeGuard, options) {
    const overlay = document.getElementById(CSS_DEBUG_BOUNDARY_OVERLAY_ID);
    if (!scopeGuard?.enabled || !scopeGuard.rect || !document.documentElement.hasAttribute('data-ui-inspect-css-debug') || (!options?.visible && !options?.clamped)) {
      if (overlay) overlay.style.display = 'none';
      return;
    }
    const boundary = ensureCssDebugBoundaryOverlay();
    const rect = scopeGuard.rect;
    boundary.style.display = 'block';
    boundary.style.left = Math.round(rect.x) + 'px';
    boundary.style.top = Math.round(rect.y) + 'px';
    boundary.style.width = Math.max(1, Math.round(rect.width)) + 'px';
    boundary.style.height = Math.max(1, Math.round(rect.height)) + 'px';
    boundary.dataset.clamped = options?.clamped ? 'true' : 'false';
  }

  /**
   * Compute the visual preview rect for a target.
   * Priority:
   * 1. Active drag state computed rect (most accurate during interaction).
   * 2. Target's saved preview rect from last interaction.
   * 3. Element getBoundingClientRect().
   */
  function cssDebugPreviewRectForTarget(target) {
    if (!target || !target.element) return null;
    // 1. Active drag state: compute rect from drag offsets
    if (target.drag) {
      var d = target.drag;
      var h = d.handle;
      var affectsLeft = h === 'nw' || h === 'w' || h === 'sw';
      var affectsTop = h === 'nw' || h === 'n' || h === 'ne';
      var affectsRight = h === 'ne' || h === 'e' || h === 'se';
      var affectsBottom = h === 'sw' || h === 's' || h === 'se';

      if (h === 'move') {
        // For move: use original rect + effective dx/dy from last drag state
        var edx = d.lastEffectiveDx !== undefined ? d.lastEffectiveDx : d.lastDx;
        var edy = d.lastEffectiveDy !== undefined ? d.lastEffectiveDy : d.lastDy;
        return {
          x: d.rectBefore.x + edx,
          y: d.rectBefore.y + edy,
          width: d.rectBefore.width,
          height: d.rectBefore.height
        };
      }

      // For resize: compute from clamp result or raw delta
      var cr = d.clampResult;
      var nextWidth, nextHeight, nextX, nextY;
      if (cr) {
        nextWidth = Math.max(1, Math.round(cr.resultWidth));
        nextHeight = Math.max(1, Math.round(cr.resultHeight));
        nextX = d.rectBefore.x;
        nextY = d.rectBefore.y;
        if (affectsLeft) nextX = d.rectBefore.x + cr.clampDx;
        if (affectsTop) nextY = d.rectBefore.y + cr.clampDy;
      } else {
        nextWidth = d.width;
        nextHeight = d.height;
        nextX = d.rectBefore.x;
        nextY = d.rectBefore.y;
        if (affectsRight) nextWidth = Math.max(1, Math.round(d.width + d.lastDx));
        if (affectsLeft) {
          var dx = d.lastDx;
          var maxDx = d.width - 1;
          var pdx = Math.min(dx, maxDx);
          nextWidth = Math.max(1, Math.round(d.width - pdx));
          nextX = d.rectBefore.x + pdx;
        }
        if (affectsBottom) nextHeight = Math.max(1, Math.round(d.height + d.lastDy));
        if (affectsTop) {
          var dy = d.lastDy;
          var maxDy = d.height - 1;
          var pdy = Math.min(dy, maxDy);
          nextHeight = Math.max(1, Math.round(d.height - pdy));
          nextY = d.rectBefore.y + pdy;
        }
      }
      return {
        x: nextX,
        y: nextY,
        width: nextWidth,
        height: nextHeight
      };
    }

    // 2. Saved preview rect from last interaction
    if (target.previewRect) {
      return target.previewRect;
    }

    // 3. Fallback to actual DOM rect
    return cssDebugRect(target.element);
  }

  function updateCssDebugOverlayForTarget(target) {
    if (!target?.element || !document.documentElement.hasAttribute('data-ui-inspect-css-debug')) {
      return;
    }
    var rect = cssDebugPreviewRectForTarget(target);
    if (!rect) return;
    var overlay = document.getElementById(CSS_DEBUG_OVERLAY_ID);
    if (!overlay || overlay.style.display === 'none') return;
    overlay.style.left = Math.round(rect.x) + 'px';
    overlay.style.top = Math.round(rect.y) + 'px';
    overlay.style.width = Math.max(1, Math.round(rect.width)) + 'px';
    overlay.style.height = Math.max(1, Math.round(rect.height)) + 'px';
  }

  function updateCssDebugOverlay() {
    var panel = cssDebugPanel();
    var target = cssDebugActiveTarget();
    if (!target?.element || !document.documentElement.hasAttribute('data-ui-inspect-css-debug') || panel?.dataset?.sent === 'true') {
      removeCssDebugOverlay();
      return;
    }
    removeCssDebugPreviewOverlay();
    var rect = cssDebugPreviewRectForTarget(target);
    var overlay = ensureCssDebugOverlay();
    overlay.style.display = 'block';
    overlay.style.left = Math.round(rect.x) + 'px';
    overlay.style.top = Math.round(rect.y) + 'px';
    overlay.style.width = Math.max(1, Math.round(rect.width)) + 'px';
    overlay.style.height = Math.max(1, Math.round(rect.height)) + 'px';
    var showBoxModel = target.showBoxModel;
    var marginEl = overlay.querySelector('.ui-inspect-box-model-margin');
    var paddingEl = overlay.querySelector('.ui-inspect-box-model-padding');
    if (marginEl) marginEl.style.display = showBoxModel ? 'block' : 'none';
    if (paddingEl) paddingEl.style.display = showBoxModel ? 'block' : 'none';
    if (showBoxModel && target.element) {
      var computed = window.getComputedStyle(target.element);
      var mt = parseFloat(computed.marginTop) || 0;
      var mr = parseFloat(computed.marginRight) || 0;
      var mb = parseFloat(computed.marginBottom) || 0;
      var ml = parseFloat(computed.marginLeft) || 0;
      var pt = parseFloat(computed.paddingTop) || 0;
      var pr = parseFloat(computed.paddingRight) || 0;
      var pb = parseFloat(computed.paddingBottom) || 0;
      var pl = parseFloat(computed.paddingLeft) || 0;
      if (marginEl) {
        marginEl.style.left = Math.round(-ml) + 'px';
        marginEl.style.top = Math.round(-mt) + 'px';
        marginEl.style.width = Math.round(rect.width + ml + mr) + 'px';
        marginEl.style.height = Math.round(rect.height + mt + mb) + 'px';
      }
      if (paddingEl) {
        paddingEl.style.left = '0px';
        paddingEl.style.top = '0px';
        paddingEl.style.width = Math.round(rect.width) + 'px';
        paddingEl.style.height = Math.round(rect.height) + 'px';
        paddingEl.style.borderWidth = Math.round(pt) + 'px ' + Math.round(pr) + 'px ' + Math.round(pb) + 'px ' + Math.round(pl) + 'px';
      }
    }
    if (!target.drag) {
      target.scopeGuard = resolveCssDebugBoundary(target.element) || target.scopeGuard;
    }
    updateCssDebugBoundaryOverlay(target.scopeGuard, { clamped: !!target.scopeGuard?.clamped });
  }
`;
