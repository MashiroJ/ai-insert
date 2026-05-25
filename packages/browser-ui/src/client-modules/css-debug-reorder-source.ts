// Generated browser client source fragment for CSS Debug.
export const cssDebugReorderClientSource = `
  function findSwappableSiblings(element) {
    const parent = element.parentElement;
    if (!parent) return [];
    const elTag = element.tagName.toLowerCase();
    const elClasses = new Set((element.className && typeof element.className === 'string' ? element.className : '').split(/\\s+/).filter(Boolean));
    const elRole = element.getAttribute('role') || '';
    const elRect = element.getBoundingClientRect();
    const results = [];
    const children = parent.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child === element) continue;
      if (child.nodeType !== 1) continue;
      if (!child.getBoundingClientRect) continue;
      const tag = child.tagName.toLowerCase();
      if (tag === 'svg' || tag === 'script' || tag === 'style' || tag === 'link' || tag === 'meta') continue;
      const matchedBy = [];
      if (tag === elTag) matchedBy.push('tagName');
      const childClasses = (child.className && typeof child.className === 'string' ? child.className : '').split(/\\s+/).filter(Boolean);
      const sharedClasses = childClasses.filter((c) => elClasses.has(c));
      if (sharedClasses.length > 0) matchedBy.push('class:' + sharedClasses[0]);
      const childRole = child.getAttribute('role') || '';
      if (childRole && childRole === elRole && childRole) matchedBy.push('role');
      const childRect = child.getBoundingClientRect();
      const sizeRatio = Math.min(elRect.width, childRect.width) / Math.max(elRect.width, childRect.width, 1);
      if (sizeRatio > 0.5 && sizeRatio < 2) matchedBy.push('size');
      if (matchedBy.length >= 1) {
        results.push({ element: child, index: i, matchedBy, rect: childRect });
      }
    }
    return results;
  }

  function cssDebugElementStableId(el) {
    return cssDebugElementKey(el);
  }

  function ensureCssDebugSwapOverlay() {
    let overlay = document.getElementById(CSS_DEBUG_SWAP_OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = CSS_DEBUG_SWAP_OVERLAY_ID;
      overlay.style.cssText = 'position:fixed;z-index:2147483644;display:none;pointer-events:none;border:2px solid rgba(168,85,247,.88);background:rgba(168,85,247,.1);border-radius:4px;transition:opacity .12s';
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function showCssDebugSwapOverlay(el, label) {
    const overlay = ensureCssDebugSwapOverlay();
    const rect = el.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.left = Math.round(rect.left) + 'px';
    overlay.style.top = Math.round(rect.top) + 'px';
    overlay.style.width = Math.round(rect.width) + 'px';
    overlay.style.height = Math.round(rect.height) + 'px';
    if (label) overlay.setAttribute('data-label', label);
    else overlay.removeAttribute('data-label');
  }

  function hideCssDebugSwapOverlay() {
    const overlay = document.getElementById(CSS_DEBUG_SWAP_OVERLAY_ID);
    if (overlay) overlay.style.display = 'none';
  }

  function elementAtPointForSwap(clientX, clientY, excludeElement) {
    const els = document.elementsFromPoint(clientX, clientY);
    for (const el of els) {
      if (el === excludeElement) continue;
      if (isOwnNode(el)) continue;
      return el;
    }
    return null;
  }
`;
