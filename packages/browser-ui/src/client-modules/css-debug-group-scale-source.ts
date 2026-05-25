// Generated browser client source fragment for CSS Debug.
// Group Scale V1: when resizing a container, optionally scale direct children proportionally.
export const cssDebugGroupScaleClientSource = `
  /**
   * Take a snapshot of the container's direct children before group-scale begins.
   * Records original rects and inline styles so we can restore later.
   * Maximum 20 children; invisible and SVG/text-node children are skipped.
   */
  function beginCssDebugGroupScaleSnapshot(target) {
    if (!target?.element) return;
    var children = [];
    var childNodes = target.element.children;
    for (var i = 0; i < childNodes.length && children.length < 20; i++) {
      var child = childNodes[i];
      if (child.nodeType !== 1) continue;
      if (!child.getBoundingClientRect) continue;
      var tag = child.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'link' || tag === 'meta') continue;
      var childRect = child.getBoundingClientRect();
      // Skip invisible children
      if (childRect.width < 1 || childRect.height < 1) continue;
      var computed = window.getComputedStyle(child);
      if (computed.display === 'none' || computed.visibility === 'hidden') continue;
      children.push({
        element: child,
        originalRect: cssDebugRect(child),
        originalInlineCssText: child.style.cssText || '',
        selector: selectorFor(child),
        tagName: tag,
        className: typeof child.className === 'string' ? child.className : ''
      });
    }
    target._groupScaleSnapshot = {
      containerOriginalRect: cssDebugRect(target.element),
      children: children
    };
  }

  /**
   * Apply proportional preview styles to children based on container size change.
   * Returns info about the group scale effect for payload.
   */
  function applyCssDebugGroupScale(target, previewRect) {
    if (!target?._groupScaleSnapshot) return null;
    var snap = target._groupScaleSnapshot;
    var containerBefore = snap.containerOriginalRect;
    var scaleX = containerBefore.width > 0 ? previewRect.width / containerBefore.width : 1;
    var scaleY = containerBefore.height > 0 ? previewRect.height / containerBefore.height : 1;
    // Avoid degenerate scales
    if (!isFinite(scaleX) || !isFinite(scaleY)) return null;
    if (scaleX < 0.1) scaleX = 0.1;
    if (scaleY < 0.1) scaleY = 0.1;

    var childEffects = [];
    for (var i = 0; i < snap.children.length; i++) {
      var child = snap.children[i];
      var origRect = child.originalRect;
      // Compute preview position relative to container origin
      var relX = origRect.x - containerBefore.x;
      var relY = origRect.y - containerBefore.y;
      var newX = previewRect.x + relX * scaleX;
      var newY = previewRect.y + relY * scaleY;
      var newW = Math.max(1, Math.round(origRect.width * scaleX));
      var newH = Math.max(1, Math.round(origRect.height * scaleY));
      var translateX = Math.round(newX - origRect.x);
      var translateY = Math.round(newY - origRect.y);

      // Apply preview styles using width, height, and translate
      child.element.style.width = newW + 'px';
      child.element.style.height = newH + 'px';
      var existingTransform = child.element.style.getPropertyValue('transform') || '';
      var base = existingTransform.replace(/translate\\([^)]*\\)/gi, '').trim();
      child.element.style.transform = (base ? base + ' ' : '') + 'translate(' + translateX + 'px, ' + translateY + 'px)';

      childEffects.push({
        selector: child.selector,
        tagName: child.tagName,
        className: child.className,
        beforeRect: { x: Math.round(origRect.x), y: Math.round(origRect.y), width: Math.round(origRect.width), height: Math.round(origRect.height) },
        afterRect: { x: Math.round(newX), y: Math.round(newY), width: newW, height: newH },
        changedStyles: {
          width: { originalValue: Math.round(origRect.width) + 'px', previewValue: newW + 'px' },
          height: { originalValue: Math.round(origRect.height) + 'px', previewValue: newH + 'px' },
          transform: { originalValue: existingTransform || 'none', previewValue: 'translate(' + translateX + 'px, ' + translateY + 'px)' }
        }
      });
    }

    return {
      scaleX: Math.round(scaleX * 100) / 100,
      scaleY: Math.round(scaleY * 100) / 100,
      origin: 'top-left',
      affectedChildren: childEffects.length,
      childEffects: childEffects
    };
  }

  /**
   * Reset all children to their original inline styles.
   */
  function resetCssDebugGroupScale(target) {
    if (!target?._groupScaleSnapshot) return;
    var snap = target._groupScaleSnapshot;
    for (var i = 0; i < snap.children.length; i++) {
      var child = snap.children[i];
      child.element.style.cssText = child.originalInlineCssText || '';
    }
    delete target._groupScaleSnapshot;
  }

  /**
   * Build a summary of group-scale child effects for display.
   */
  function cssDebugGroupScaleChildEffects(target) {
    if (!target?._groupScaleSnapshot) return [];
    var snap = target._groupScaleSnapshot;
    return snap.children.map(function(child) {
      return {
        selector: child.selector,
        tagName: child.tagName,
        className: child.className
      };
    });
  }
`;
