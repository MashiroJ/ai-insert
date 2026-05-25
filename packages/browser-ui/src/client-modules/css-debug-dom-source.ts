// Generated browser client source fragment for CSS Debug.
export const cssDebugDomClientSource = `
  function cssDebugRect(el) {
    const rect = el.getBoundingClientRect();
    return {
      x: Math.round(rect.x * 10) / 10,
      y: Math.round(rect.y * 10) / 10,
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10
    };
  }

  function cssDebugText(el) {
    return (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 120);
  }

  function cssDebugElementSnapshot(el, includeStyles) {
    if (!el) return null;
    const computed = window.getComputedStyle(el);
    const styles = includeStyles ? {
      display: computed.getPropertyValue('display') || '',
      position: computed.getPropertyValue('position') || '',
      width: computed.getPropertyValue('width') || '',
      height: computed.getPropertyValue('height') || '',
      gap: computed.getPropertyValue('gap') || '',
      'grid-template-columns': computed.getPropertyValue('grid-template-columns') || '',
      'flex-direction': computed.getPropertyValue('flex-direction') || '',
      'align-items': computed.getPropertyValue('align-items') || '',
      'justify-content': computed.getPropertyValue('justify-content') || '',
      padding: computed.getPropertyValue('padding') || ''
    } : undefined;
    return {
      selector: selectorFor(el),
      tagName: el.tagName.toLowerCase(),
      className: typeof el.className === 'string' ? el.className : '',
      text: cssDebugText(el),
      rect: cssDebugRect(el),
      ...(styles ? { styles } : {})
    };
  }

  function cssDebugLayoutSnapshot(el) {
    const parent = el.parentElement;
    const siblings = parent ? Array.from(parent.children).filter((item) => item !== el).slice(0, 4) : [];
    const children = Array.from(el.children).slice(0, 6);
    return {
      parent: parent ? cssDebugElementSnapshot(parent, true) : null,
      siblings: siblings.map((item) => cssDebugElementSnapshot(item, false)),
      children: children.map((item) => cssDebugElementSnapshot(item, false))
    };
  }

  function cssDebugRectChanged(before, after, keys) {
    if (!before || !after) return false;
    return keys.some((key) => Math.abs((before[key] || 0) - (after[key] || 0)) > 0.5);
  }

  function cssDebugElementEffect(before, after) {
    if (!before || !after) return null;
    return {
      selector: before.selector,
      tagName: before.tagName,
      className: before.className,
      text: before.text,
      beforeRect: before.rect,
      afterRect: after.rect,
      sizeChanged: cssDebugRectChanged(before.rect, after.rect, ['width', 'height']),
      positionChanged: cssDebugRectChanged(before.rect, after.rect, ['x', 'y'])
    };
  }

  function cssDebugLayoutContext() {
    return cssDebugLayoutContextFor(cssDebugActiveTarget());
  }

  function cssDebugLayoutContextFor(target) {
    if (!target?.element) return undefined;
    const before = target.originalLayout || cssDebugLayoutSnapshot(target.element);
    const after = cssDebugLayoutSnapshot(target.element);
    return {
      parent: after.parent || before.parent || undefined,
      siblings: before.siblings.map((item, index) => cssDebugElementEffect(item, after.siblings[index])).filter(Boolean),
      children: before.children.map((item, index) => cssDebugElementEffect(item, after.children[index])).filter(Boolean)
    };
  }

  function cssDebugColorToHex(value) {
    const match = String(value || '').match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/i);
    if (!match) return '#ffffff';
    return '#' + [match[1], match[2], match[3]].map((item) => {
      return Math.max(0, Math.min(255, Number(item))).toString(16).padStart(2, '0');
    }).join('');
  }

  function cssDebugRangeValue(value, fallback) {
    const match = String(value || '').match(/-?\\d+(?:\\.\\d+)?/);
    if (!match) return String(fallback);
    return match[0];
  }

  function cssDebugControlHtml(property, value) {
    const label = property;
    const range = CSS_DEBUG_RANGE[property];
    const select = CSS_DEBUG_SELECT_OPTIONS[property];
    const previewValue = escapeHtml(value || '');
    if (select) {
      return '<label class="ui-inspect-css-row" data-css-property="' + escapeHtml(property) + '">' +
        '<span>' + escapeHtml(label) + '</span>' +
        '<select data-css-input="' + escapeHtml(property) + '">' +
          select.map((item) => '<option value="' + escapeHtml(item) + '"' + (item === value ? ' selected' : '') + '>' + escapeHtml(item || 'auto') + '</option>').join('') +
        '</select>' +
      '</label>';
    }
    if (property.includes('color')) {
      return '<label class="ui-inspect-css-row ui-inspect-css-row-color" data-css-property="' + escapeHtml(property) + '">' +
        '<span>' + escapeHtml(label) + '</span>' +
        '<input type="color" data-css-color="' + escapeHtml(property) + '" value="' + escapeHtml(cssDebugColorToHex(value)) + '" />' +
        '<input type="text" data-css-input="' + escapeHtml(property) + '" value="' + previewValue + '" placeholder="rgb(...) / #fff" />' +
      '</label>';
    }
    return '<label class="ui-inspect-css-row" data-css-property="' + escapeHtml(property) + '">' +
      '<span>' + escapeHtml(label) + '</span>' +
      (range ? '<input type="range" data-css-range="' + escapeHtml(property) + '" min="' + range.min + '" max="' + range.max + '" step="' + (range.step || 1) + '" value="' + escapeHtml(cssDebugRangeValue(value, range.min)) + '" />' : '') +
      '<input type="text" data-css-input="' + escapeHtml(property) + '" value="' + previewValue + '" placeholder="auto" />' +
    '</label>';
  }

  function cssDebugFilteredGroups() {
    if (!cssDebugActiveTarget()?.changedOnly) return CSS_DEBUG_GROUPS;
    const active = cssDebugActiveTarget()?.activeProperties || new Set();
    return CSS_DEBUG_GROUPS
      .map((group) => {
        const properties = [...group.properties, ...(group.changedOnlyProperties || [])].filter((property) => active.has(property));
        return { ...group, open: true, properties };
      })
      .filter((group) => group.properties.length);
  }
`;
