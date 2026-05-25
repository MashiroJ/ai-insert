// Generated browser client source fragment for CSS Debug.
export const cssDebugValuesClientSource = `
  function cssDebugTranslateFromTransform(value) {
    const text = String(value || '');
    const translate = text.match(/translate(?:3d)?\\(\\s*(-?\\d+(?:\\.\\d+)?)px\\s*,\\s*(-?\\d+(?:\\.\\d+)?)px/i);
    if (translate) return { x: Number(translate[1]) || 0, y: Number(translate[2]) || 0 };
    const translateX = text.match(/translateX\\(\\s*(-?\\d+(?:\\.\\d+)?)px/i);
    const translateY = text.match(/translateY\\(\\s*(-?\\d+(?:\\.\\d+)?)px/i);
    return {
      x: translateX ? Number(translateX[1]) || 0 : 0,
      y: translateY ? Number(translateY[1]) || 0 : 0
    };
  }

  function cssDebugTransformBase(value) {
    return String(value || '').replace(/translate(?:3d)?\\([^)]*\\)/gi, '').replace(/translate[XY]\\([^)]*\\)/gi, '').trim();
  }

  function cssDebugPreviewTransform(base, x, y) {
    const prefix = base && base !== 'none' ? base + ' ' : '';
    return prefix + 'translate(' + Math.round(x) + 'px, ' + Math.round(y) + 'px)';
  }

  function cssDebugPanel() {
    const panel = document.getElementById(PANEL_ID);
    return panel?.dataset?.mode === 'css-debug' ? panel : null;
  }

  function syncCssDebugControl(panel, property, value) {
    if (!panel) return;
    const input = panel.querySelector('[data-css-input="' + property + '"]');
    if (input) input.value = value;
    const range = panel.querySelector('[data-css-range="' + property + '"]');
    if (range) range.value = cssDebugRangeValue(value, range.min || 0);
  }

  function moveCssDebugOverlayPreview(rect, dx, dy, width, height) {
    let overlay = document.getElementById(CSS_DEBUG_PREVIEW_OVERLAY_ID);
    if (!rect) return;
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = CSS_DEBUG_PREVIEW_OVERLAY_ID;
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'block';
    overlay.style.left = Math.round(rect.x + dx) + 'px';
    overlay.style.top = Math.round(rect.y + dy) + 'px';
    overlay.style.width = Math.max(1, Math.round(width ?? rect.width)) + 'px';
    overlay.style.height = Math.max(1, Math.round(height ?? rect.height)) + 'px';
  }

  function resetCssDebugPreview() {
    const target = cssDebugActiveTarget();
    if (!target?.element) return;
    target.element.style.cssText = target.originalInlineCssText || '';
    target.previewStyles = {};
    target.activeProperties = new Set();
    target.interactions = [];
    target.primaryInteraction = null;
    if (target.scopeGuard) target.scopeGuard.clamped = false;
    removeCssDebugOverlay();
    if (activeElement === target.element) highlightElement(activeElement);
  }

  function resetAllCssDebugTargets() {
    if (!cssDebugSession) return;
    for (const target of cssDebugSession.targets.values()) {
      if (target.element) {
        target.element.style.cssText = target.originalInlineCssText || '';
      }
    }
    cssDebugSession = null;
    removeCssDebugOverlay();
    clearHighlight();
  }

  function applyCssDebugValue(property, value) {
    const target = cssDebugActiveTarget();
    if (!target?.element) return;
    if (cssDebugSession && cssDebugSession.sent) return;
    const nextValue = String(value || '').trim();
    if (nextValue) target.element.style.setProperty(property, nextValue);
    else target.element.style.removeProperty(property);
    const preview = cssDebugComputedStyles(target.element);
    target.previewStyles[property] = property === 'transform'
      ? (target.element.style.getPropertyValue('transform') || '')
      : (preview[property] || '');
    target.activeProperties.add(property);
    if (activeElement === target.element) highlightElement(activeElement);
    updateCssDebugOverlay();
    updateCssDebugMiniBar();
  }
`;
