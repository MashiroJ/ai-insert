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

  function updateCssDebugOverlay() {
    const panel = cssDebugPanel();
    const target = cssDebugActiveTarget();
    if (!target?.element || !document.documentElement.hasAttribute('data-ui-inspect-css-debug') || panel?.dataset?.sent === 'true') {
      removeCssDebugOverlay();
      return;
    }
    removeCssDebugPreviewOverlay();
    const rect = target.element.getBoundingClientRect();
    const overlay = ensureCssDebugOverlay();
    overlay.style.display = 'block';
    overlay.style.left = Math.round(rect.left) + 'px';
    overlay.style.top = Math.round(rect.top) + 'px';
    overlay.style.width = Math.max(1, Math.round(rect.width)) + 'px';
    overlay.style.height = Math.max(1, Math.round(rect.height)) + 'px';
    const showBoxModel = target.showBoxModel;
    const marginEl = overlay.querySelector('.ui-inspect-box-model-margin');
    const paddingEl = overlay.querySelector('.ui-inspect-box-model-padding');
    if (marginEl) marginEl.style.display = showBoxModel ? 'block' : 'none';
    if (paddingEl) paddingEl.style.display = showBoxModel ? 'block' : 'none';
    if (showBoxModel && target.element) {
      const computed = window.getComputedStyle(target.element);
      const mt = parseFloat(computed.marginTop) || 0;
      const mr = parseFloat(computed.marginRight) || 0;
      const mb = parseFloat(computed.marginBottom) || 0;
      const ml = parseFloat(computed.marginLeft) || 0;
      const pt = parseFloat(computed.paddingTop) || 0;
      const pr = parseFloat(computed.paddingRight) || 0;
      const pb = parseFloat(computed.paddingBottom) || 0;
      const pl = parseFloat(computed.paddingLeft) || 0;
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
//# sourceMappingURL=css-debug-overlay-source.js.map