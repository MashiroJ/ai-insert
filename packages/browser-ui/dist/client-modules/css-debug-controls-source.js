// Generated browser client source fragment for CSS Debug.
export const cssDebugControlsClientSource = `
  function renderCssDebugControls(panel) {
    const box = panel.querySelector('.ui-inspect-css-groups');
    const target = cssDebugActiveTarget();
    if (!box || !target) return;
    const styles = cssDebugPreviewStyles();
    const groups = cssDebugFilteredGroups();
    box.innerHTML = groups.length ? groups.map((group) => (
      '<details class="ui-inspect-css-group"' + (group.open ? ' open' : '') + '>' +
        '<summary class="ui-inspect-css-group-title">' + escapeHtml(group.title) + '</summary>' +
        group.properties.map((property) => cssDebugControlHtml(property, styles[property] || '')).join('') +
      '</details>'
    )).join('') : '<div class="ui-inspect-css-empty ui-inspect-css-empty-controls">还没有主动改动。先调一个属性，或关闭“只看已改”。</div>';
    const toggle = panel.querySelector('[data-action="toggle-changed-only"]');
    if (toggle) {
      toggle.textContent = target.changedOnly ? '显示全部' : '只看已改';
      toggle.setAttribute('aria-pressed', target.changedOnly ? 'true' : 'false');
    }
    wireCssDebugControls(panel);
    renderCssDebugDiff(panel);
    renderCssDebugInteraction(panel);
  }

  function renderCssDebugDiff(panel) {
    const diffEl = panel.querySelector('.ui-inspect-css-diff');
    const target = cssDebugActiveTarget();
    if (!diffEl || !target) return;
    const previewStyles = cssDebugPreviewStyles();
    const diff = cssDebugChangedStyles(target.originalStyles, previewStyles, target.activeProperties);
    const effects = cssDebugComputedEffects(target.originalStyles, previewStyles, target.activeProperties).self;
    const layout = cssDebugLayoutContext();
    const keys = Object.keys(diff);
    const effectKeys = Object.keys(effects);
    const moved = (layout?.siblings || []).filter((item) => item.sizeChanged || item.positionChanged).length;
    const childChanged = (layout?.children || []).filter((item) => item.sizeChanged || item.positionChanged).length;
    diffEl.innerHTML = [
      '<div class="ui-inspect-css-diff-title">主动改动</div>',
      keys.length
      ? keys.map((key) => '<div><code>' + escapeHtml(key) + '</code><span>' + escapeHtml(diff[key].originalValue || 'auto') + '</span><strong>→</strong><span>' + escapeHtml(diff[key].previewValue || 'auto') + '</span></div>').join('')
      : '<div class="ui-inspect-css-empty">还没有样式改动。</div>',
      effectKeys.length
        ? '<div class="ui-inspect-css-effect"><b>连带影响</b><span>' + escapeHtml(effectKeys.slice(0, 4).join(', ') + (effectKeys.length > 4 ? ' 等' : '')) + '</span></div>'
        : '',
      layout?.parent
        ? '<div class="ui-inspect-css-effect"><b>父级布局</b><span>' + escapeHtml((layout.parent.styles?.display || 'block') + (layout.parent.styles?.gap ? ' · gap ' + layout.parent.styles.gap : '')) + '</span></div>'
        : '',
      moved || childChanged
        ? '<div class="ui-inspect-css-warning"><b>布局提醒</b><span>' + escapeHtml((moved ? moved + ' 个兄弟元素受影响' : '') + (moved && childChanged ? '，' : '') + (childChanged ? childChanged + ' 个子元素受影响' : '')) + '</span></div>'
        : ''
    ].filter(Boolean).join('');
    renderCssDebugInteraction(panel);
  }

  function renderCssDebugInteraction(panel) {
    const el = panel.querySelector('.ui-inspect-css-interaction');
    const target = cssDebugActiveTarget();
    if (!el || !target) return;
    const item = target.primaryInteraction;
    if (!item) {
      el.innerHTML = '<b>拖拽记录</b><span>暂无</span>';
      return;
    }
    const delta = item.delta || {};
    const parts = [];
    if (Math.abs(delta.x || 0) > 0.5 || Math.abs(delta.y || 0) > 0.5) parts.push('x ' + (delta.x || 0) + 'px, y ' + (delta.y || 0) + 'px');
    if (Math.abs(delta.width || 0) > 0.5) parts.push('w ' + delta.width + 'px');
    if (Math.abs(delta.height || 0) > 0.5) parts.push('h ' + delta.height + 'px');
    el.innerHTML = '<b>拖拽记录</b><span>' + escapeHtml((item.type === 'move' ? '移动' : '缩放') + ' · ' + item.handle + (parts.length ? ' · ' + parts.join(' · ') : '')) + '</span>';
  }

  function wireCssDebugControls(panel) {
    Array.from(panel.querySelectorAll('[data-css-input]')).forEach((input) => {
      input.addEventListener('input', () => {
        const property = input.getAttribute('data-css-input');
        if (!property) return;
        applyCssDebugValue(property, input.value);
        const row = input.closest('[data-css-property]');
        const range = row?.querySelector('[data-css-range="' + property + '"]');
        if (range) range.value = cssDebugRangeValue(input.value, range.min || 0);
        const color = row?.querySelector('[data-css-color="' + property + '"]');
        if (color) color.value = cssDebugColorToHex(input.value);
        renderCssDebugDiff(panel);
      });
    });
    Array.from(panel.querySelectorAll('[data-css-color]')).forEach((input) => {
      input.addEventListener('input', () => {
        const property = input.getAttribute('data-css-color');
        if (!property) return;
        const row = input.closest('[data-css-property]');
        const text = row?.querySelector('[data-css-input="' + property + '"]');
        if (text) text.value = input.value;
        applyCssDebugValue(property, input.value);
        renderCssDebugDiff(panel);
      });
    });
    Array.from(panel.querySelectorAll('[data-css-range]')).forEach((range) => {
      range.addEventListener('input', () => {
        const property = range.getAttribute('data-css-range');
        if (!property) return;
        const config = CSS_DEBUG_RANGE[property] || { unit: '' };
        const value = range.value + (config.unit || '');
        const row = range.closest('[data-css-property]');
        const input = row?.querySelector('[data-css-input="' + property + '"]');
        if (input) input.value = value;
        applyCssDebugValue(property, value);
        renderCssDebugDiff(panel);
      });
    });
  }
`;
//# sourceMappingURL=css-debug-controls-source.js.map