// Generated browser client source fragment for CSS Debug.
export const cssDebugStateClientSource = `
  const CSS_DEBUG_PROPERTIES = [
    'margin',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'gap',
    'width',
    'height',
    'min-width',
    'max-width',
    'min-height',
    'max-height',
    'display',
    'flex-direction',
    'align-items',
    'justify-content',
    'font-size',
    'font-weight',
    'line-height',
    'letter-spacing',
    'color',
    'background-color',
    'border',
    'border-radius',
    'box-shadow',
    'opacity',
    'transform'
  ];

  const CSS_DEBUG_GROUPS = [
    {
      title: 'Spacing',
      properties: ['margin', 'padding', 'gap'],
      changedOnlyProperties: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
      open: true
    },
    { title: 'Typography', properties: ['font-size', 'font-weight', 'line-height', 'color'], changedOnlyProperties: ['letter-spacing'], open: false },
    { title: 'Visual', properties: ['background-color', 'border', 'border-radius', 'box-shadow', 'opacity'], open: false },
    { title: 'Size', properties: ['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height'], open: false },
    { title: 'Layout', properties: ['display', 'flex-direction', 'align-items', 'justify-content', 'transform'], open: false }
  ];

  const CSS_DEBUG_SELECT_OPTIONS = {
    display: ['', 'block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'none'],
    'flex-direction': ['', 'row', 'row-reverse', 'column', 'column-reverse'],
    'align-items': ['', 'stretch', 'flex-start', 'center', 'flex-end', 'baseline'],
    'justify-content': ['', 'flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
    'font-weight': ['', '300', '400', '500', '600', '700', '800', '900']
  };

  const CSS_DEBUG_RANGE = {
    margin: { min: -80, max: 120, unit: 'px' },
    padding: { min: 0, max: 120, unit: 'px' },
    gap: { min: 0, max: 80, unit: 'px' },
    width: { min: 0, max: 960, unit: 'px' },
    height: { min: 0, max: 720, unit: 'px' },
    'min-width': { min: 0, max: 960, unit: 'px' },
    'max-width': { min: 0, max: 1200, unit: 'px' },
    'min-height': { min: 0, max: 720, unit: 'px' },
    'max-height': { min: 0, max: 960, unit: 'px' },
    'font-size': { min: 8, max: 96, unit: 'px' },
    'border-radius': { min: 0, max: 80, unit: 'px' },
    opacity: { min: 0, max: 1, step: 0.01, unit: '' }
  };

  function cssDebugComputedStyles(el) {
    const computed = window.getComputedStyle(el);
    const out = {};
    CSS_DEBUG_PROPERTIES.forEach((property) => {
      out[property] = computed.getPropertyValue(property) || '';
    });
    return out;
  }

  function cssDebugInlineStyles(el) {
    const out = {};
    CSS_DEBUG_PROPERTIES.forEach((property) => {
      out[property] = el.style.getPropertyValue(property) || '';
    });
    return out;
  }

  function cssDebugChangedStyles(originalStyles, previewStyles, properties) {
    const out = {};
    Array.from(properties || CSS_DEBUG_PROPERTIES).forEach((property) => {
      const before = originalStyles[property] || '';
      const after = previewStyles[property] || '';
      if (before !== after) out[property] = { originalValue: before, previewValue: after };
    });
    return out;
  }

  function cssDebugComputedEffects(originalStyles, previewStyles, activeProperties) {
    const active = new Set(activeProperties || []);
    return {
      self: cssDebugChangedStyles(
        originalStyles,
        previewStyles,
        CSS_DEBUG_PROPERTIES.filter((property) => !active.has(property))
      )
    };
  }

  function cssDebugPreviewStyles() {
    const target = cssDebugActiveTarget();
    if (!target?.element) return {};
    const computed = cssDebugComputedStyles(target.element);
    return { ...computed, ...target.previewStyles };
  }

  function cssDebugActiveTarget() {
    if (!cssDebugSession) return null;
    return cssDebugSession.targets.get(cssDebugSession.activeTargetId) || null;
  }

  function cssDebugElementKey(el) {
    if (cssDebugElementIds && cssDebugElementIds.has(el)) return cssDebugElementIds.get(el);
    const key = 'css-el-' + cssDebugNextElementId++;
    if (cssDebugElementIds) cssDebugElementIds.set(el, key);
    return key;
  }

  function cssDebugSmartTargetElement(el) {
    if (!el || !el.parentElement || !el.getBoundingClientRect) return el;
    const tag = el.tagName?.toLowerCase?.() || '';
    const svgLeafTags = new Set(['path', 'rect', 'circle', 'line', 'polyline', 'polygon', 'ellipse', 'text']);
    if (svgLeafTags.has(tag)) {
      const group = el.closest?.('g');
      if (group && group.getBoundingClientRect) return group;
      if (el.ownerSVGElement && el.ownerSVGElement.getBoundingClientRect) return el.ownerSVGElement;
    }
    const leafTags = new Set(['span', 'strong', 'em', 'b', 'i', 'small', 'label', 'svg', 'path', 'circle', 'text']);
    const text = cssDebugText(el);
    const childRect = el.getBoundingClientRect();
    if (!leafTags.has(tag) && !(text && childRect.width < 120 && childRect.height < 48)) return el;
    let current = el.parentElement;
    let depth = 0;
    while (current && current !== document.body && depth < 4) {
      const rect = current.getBoundingClientRect();
      const className = typeof current.className === 'string' ? current.className.trim() : '';
      const hasSemanticMarker = !!(className || current.id || current.hasAttribute?.('data-component') || current.getAttribute?.('role'));
      const childArea = Math.max(1, childRect.width * childRect.height);
      const area = Math.max(1, rect.width * rect.height);
      const localEnough = area <= Math.max(childArea * 12, 90000) && rect.width <= window.innerWidth * 0.72 && rect.height <= window.innerHeight * 0.72;
      if (hasSemanticMarker && localEnough && rect.width >= childRect.width && rect.height >= childRect.height) return current;
      current = current.parentElement;
      depth++;
    }
    return el;
  }
`;
