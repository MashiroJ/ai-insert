// Generated browser client source fragment for CSS Debug.
export const cssDebugPanelsClientSource = `
  const CSS_DEBUG_MINI_BAR_ID = 'ui-inspect-css-minibar';
  const CSS_DEBUG_CONTROLS_DRAWER_ID = 'ui-inspect-css-controls';
  const CSS_DEBUG_TARGETS_POPOVER_ID = 'ui-inspect-css-targets';
  const CSS_DEBUG_SEND_DIALOG_ID = 'ui-inspect-css-send';

  function cssDebugMiniBar() {
    return document.getElementById(CSS_DEBUG_MINI_BAR_ID);
  }

  function cssDebugChangedCount() {
    if (!cssDebugSession) return 0;
    let count = 0;
    for (const target of cssDebugSession.targets.values()) {
      if (Object.keys(target.previewStyles).length > 0) count++;
    }
    return count;
  }

  function updateCssDebugMiniBar() {
    const bar = cssDebugMiniBar();
    if (!bar) return;
    const desc = cssDebugActiveTarget() ? describeSelection(cssDebugActiveTarget().selection) : '';
    const changed = cssDebugChangedCount();
    const targets = cssDebugSession ? cssDebugSession.targets.size : 0;
    const sent = cssDebugSession && cssDebugSession.sent;
    const label = bar.querySelector('.ui-inspect-css-mini-label');
    if (label) {
      if (sent) {
        label.textContent = 'CSS 调试 · 已发送 · ' + changed + ' changed';
      } else if (cssDebugSession?.pickMode === 'append') {
        label.textContent = 'CSS 调试 · 添加元素中 · ' + targets + ' targets';
      } else if (targets > 1) {
        var groupScaleText = cssDebugSession.groupScaleEnabled ? ' · 缩放内容' : '';
        label.textContent = 'CSS 调试 · ' + targets + ' targets · ' + changed + ' changed' + groupScaleText;
      } else {
        var groupScaleText = cssDebugSession.groupScaleEnabled ? ' · 缩放内容' : '';
        label.textContent = 'CSS 调试 · ' + desc + ' · ' + changed + ' changed' + groupScaleText;
      }
    }
    const sendBtn = bar.querySelector('[data-mini-action="send"]');
    const controlsBtn = bar.querySelector('[data-mini-action="controls"]');
    if (sendBtn) {
      sendBtn.disabled = !!sent;
      sendBtn.textContent = sent ? '已发送' : '发送';
    }
    if (controlsBtn) {
      controlsBtn.disabled = !!sent;
    }
  }

  function renderCssDebugMiniBar() {
    let bar = cssDebugMiniBar();
    if (bar) {
      updateCssDebugMiniBar();
      return;
    }
    bar = document.createElement('div');
    bar.id = CSS_DEBUG_MINI_BAR_ID;
    bar.innerHTML = [
      '<span class="ui-inspect-css-mini-label">CSS 调试 · 0 changed</span>',
      '<div class="ui-inspect-css-mini-actions">',
        '<button type="button" data-mini-action="send" aria-label="发送">发送</button>',
        '<button type="button" data-mini-action="targets" aria-label="目标">目标</button>',
        '<button type="button" data-mini-action="controls" aria-label="控制">控制</button>',
        '<button type="button" data-mini-action="close" aria-label="关闭">×</button>',
      '</div>'
    ].join('');
    document.body.appendChild(bar);

    ['pointerdown','mousedown','mouseup','click','dblclick','mousemove'].forEach((type) => {
      bar.addEventListener(type, (event) => event.stopPropagation());
    });

    bar.querySelector('[data-mini-action="close"]').addEventListener('click', () => closeDebugPanel());
    bar.querySelector('[data-mini-action="send"]').addEventListener('click', () => openCssDebugSendDialog());
    bar.querySelector('[data-mini-action="targets"]').addEventListener('click', () => toggleCssDebugTargetsPopover());
    bar.querySelector('[data-mini-action="controls"]').addEventListener('click', () => toggleCssDebugControlsDrawer());

    updateCssDebugMiniBar();
  }

  function closeCssDebugControlsDrawer() {
    const drawer = document.getElementById(CSS_DEBUG_CONTROLS_DRAWER_ID);
    if (!drawer) return;
    const cleanup = drawer._cssDebugKeydownHandler;
    if (cleanup) document.removeEventListener('keydown', cleanup, true);
    drawer.remove();
  }

  function closeCssDebugFloatingPanels(except) {
    if (except !== 'controls') closeCssDebugControlsDrawer();
    if (except !== 'targets') {
      const popover = document.getElementById(CSS_DEBUG_TARGETS_POPOVER_ID);
      if (popover) popover.remove();
    }
    if (except !== 'send') {
      const dialog = document.getElementById(CSS_DEBUG_SEND_DIALOG_ID);
      if (dialog) dialog.remove();
    }
    if (except !== 'pick') closeCssDebugPickPopover();
  }

  function requestCssDebugAppendTarget() {
    if (!cssDebugSession) return;
    closeCssDebugFloatingPanels();
    cssDebugSession.pickMode = 'append';
    selectionMode = 'css-debug';
    setEnabled(true);
    updateCssDebugOverlay();
    showToast('添加元素：下一次点击会追加到当前 CSS 调试会话。', 'scan');
  }

  function toggleCssDebugControlsDrawer() {
    if (cssDebugSession && cssDebugSession.sent) {
      showToast('CSS diff 已发送，无法再修改。', 'idle');
      return;
    }
    let drawer = document.getElementById(CSS_DEBUG_CONTROLS_DRAWER_ID);
    if (drawer) {
      closeCssDebugControlsDrawer();
      return;
    }
    closeCssDebugFloatingPanels('controls');
    drawer = document.createElement('div');
    drawer.id = CSS_DEBUG_CONTROLS_DRAWER_ID;
    drawer.innerHTML = [
      '<div class="ui-inspect-drawer-head">',
        '<span>控制面板</span>',
        '<button type="button" data-drawer-action="close" aria-label="关闭">×</button>',
      '</div>',
      '<div class="ui-inspect-css-toolbar"><button type="button" data-action="toggle-box-model" aria-pressed="false">盒模型</button><button type="button" data-action="toggle-changed-only" aria-pressed="false">只看已改</button><label class="ui-inspect-css-toolbar-toggle"><input type="checkbox" data-action="toggle-group-scale" />缩放内容</label></div>',
      '<div class="ui-inspect-css-groups"></div>',
      '<div class="ui-inspect-css-diff"></div>',
      '<div class="ui-inspect-css-interaction"><b>拖拽记录</b><span>暂无</span></div>',
      '<div class="ui-inspect-drawer-footer">',
        '<button type="button" data-action="reset-css">Reset 当前</button>',
        '<button type="button" data-action="reset-all-css">Reset 全部</button>',
        '<button type="button" data-action="select">添加元素</button>',
      '</div>'
    ].join('');
    document.body.appendChild(drawer);

    ['pointerdown','mousedown','mouseup','click','dblclick','mousemove'].forEach((type) => {
      drawer.addEventListener(type, (event) => event.stopPropagation());
    });

    drawer.querySelector('[data-drawer-action="close"]').addEventListener('click', () => {
      closeCssDebugControlsDrawer();
    });

    function handleCssDebugKeydown(event) {
      const target = cssDebugActiveTarget();
      if (!target?.element) return;
      if (!cssDebugSession || cssDebugSession.sent) return;
      if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT')) return;
      const el = target.element;
      const sideMap = { ArrowUp: 'top', ArrowDown: 'bottom', ArrowLeft: 'left', ArrowRight: 'right' };
      const side = sideMap[event.key];
      if (!side) return;
      const isNegative = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
      const delta = isNegative ? -1 : 1;
      if (event.shiftKey && !event.altKey) {
        event.preventDefault();
        const prop = 'margin-' + side;
        const current = parseFloat(cssDebugComputedStyles(el)[prop]) || 0;
        const next = current + delta;
        applyCssDebugValue(prop, next + 'px');
        syncCssDebugControl(null, prop, next + 'px');
      } else if (event.altKey && !event.shiftKey) {
        event.preventDefault();
        const prop = 'padding-' + side;
        const current = parseFloat(cssDebugComputedStyles(el)[prop]) || 0;
        const next = Math.max(0, current + delta);
        applyCssDebugValue(prop, next + 'px');
        syncCssDebugControl(null, prop, next + 'px');
      } else if (event.shiftKey && event.altKey) {
        event.preventDefault();
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          const prop = 'font-size';
          const current = parseFloat(cssDebugComputedStyles(el)[prop]) || 16;
          const next = Math.max(8, current + delta);
          applyCssDebugValue(prop, next + 'px');
          syncCssDebugControl(null, prop, next + 'px');
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          const prop = 'letter-spacing';
          const current = parseFloat(cssDebugComputedStyles(el)[prop]) || 0;
          const next = current + delta * 0.5;
          applyCssDebugValue(prop, next + 'px');
          syncCssDebugControl(null, prop, next + 'px');
        }
      } else {
        return;
      }
      updateCssDebugOverlay();
    }
    document.addEventListener('keydown', handleCssDebugKeydown, true);
    drawer._cssDebugKeydownHandler = handleCssDebugKeydown;

    drawer.querySelector('[data-action="reset-css"]').addEventListener('click', () => {
      if (cssDebugSession && cssDebugSession.sent) {
        showToast('CSS diff 已发送，无法再修改。', 'idle');
        return;
      }
      resetCssDebugPreview();
      updateCssDebugOverlay();
      showToast('已恢复当前元素的 inline style。', 'idle');
    });
    drawer.querySelector('[data-action="reset-all-css"]').addEventListener('click', () => {
      if (cssDebugSession && cssDebugSession.sent) {
        showToast('CSS diff 已发送，无法再修改。', 'idle');
        return;
      }
      resetAllCssDebugTargets();
      removeCssDebugOverlay();
      document.documentElement.removeAttribute('data-ui-inspect-css-debug');
      closeCssDebugControlsDrawer();
      const bar = cssDebugMiniBar();
      if (bar) bar.remove();
      cssDebugSession = null;
      selectionMode = 'css-debug';
      setEnabled(true);
      showToast('已恢复全部元素的 inline style，重新开始选择。', 'idle');
    });
    drawer.querySelector('[data-action="select"]').addEventListener('click', () => {
      requestCssDebugAppendTarget();
    });
    drawer.querySelector('[data-action="toggle-box-model"]').addEventListener('click', () => {
      const target = cssDebugActiveTarget();
      if (!target) return;
      target.showBoxModel = !target.showBoxModel;
      const btn = drawer.querySelector('[data-action="toggle-box-model"]');
      if (btn) btn.setAttribute('aria-pressed', target.showBoxModel ? 'true' : 'false');
      updateCssDebugOverlay();
    });
    drawer.querySelector('[data-action="toggle-changed-only"]').addEventListener('click', () => {
      const target = cssDebugActiveTarget();
      if (!target) return;
      target.changedOnly = !target.changedOnly;
      renderCssDebugControls(drawer);
    });
    drawer.querySelector('[data-action="toggle-group-scale"]').addEventListener('change', (event) => {
      if (!cssDebugSession) return;
      cssDebugSession.groupScaleEnabled = event.target.checked;
      const target = cssDebugActiveTarget();
      if (event.target.checked && target) {
        beginCssDebugGroupScaleSnapshot(target);
      } else if (!event.target.checked && target) {
        resetCssDebugGroupScale(target);
      }
      updateCssDebugMiniBar();
    });
    // Sync checkbox with session state when drawer opens
    const gsCheckbox = drawer.querySelector('[data-action="toggle-group-scale"]');
    if (gsCheckbox && cssDebugSession) gsCheckbox.checked = !!cssDebugSession.groupScaleEnabled;

    const drawerPanel = { dataset: {}, querySelector: (sel) => drawer.querySelector(sel), querySelectorAll: (sel) => drawer.querySelectorAll(sel) };
    renderCssDebugControls(drawerPanel);
    renderCssDebugDiff(drawerPanel);
    renderCssDebugInteraction(drawerPanel);
  }

  function toggleCssDebugTargetsPopover() {
    let popover = document.getElementById(CSS_DEBUG_TARGETS_POPOVER_ID);
    if (popover) {
      popover.remove();
      return;
    }
    closeCssDebugFloatingPanels('targets');
    popover = document.createElement('div');
    popover.id = CSS_DEBUG_TARGETS_POPOVER_ID;
    popover.innerHTML = '<div class="ui-inspect-popover-head"><span>目标列表</span><button type="button" data-popover-action="close" aria-label="关闭">×</button></div><div class="ui-inspect-popover-list"></div>';
    document.body.appendChild(popover);

    ['pointerdown','mousedown','mouseup','click','dblclick','mousemove'].forEach((type) => {
      popover.addEventListener(type, (event) => event.stopPropagation());
    });

    popover.querySelector('[data-popover-action="close"]').addEventListener('click', () => popover.remove());
    renderCssDebugTargetListInto(popover.querySelector('.ui-inspect-popover-list'));
  }

  function renderCssDebugTargetListInto(container) {
    if (!container || !cssDebugSession) return;
    container.innerHTML = '';
    let index = 0;
    for (const [key, target] of cssDebugSession.targets) {
      index++;
      const hasChanged = Object.keys(target.previewStyles).length > 0;
      const isActive = key === cssDebugSession.activeTargetId;
      const desc = describeSelection(target.selection);
      const changedProps = Object.keys(target.previewStyles).join(', ') || '';
      const item = document.createElement('div');
      item.className = 'ui-inspect-target-item' + (isActive ? ' ui-inspect-target-active' : '') + (hasChanged ? '' : ' ui-inspect-target-unchanged');
      item.innerHTML = '<div class="ui-inspect-target-index">' + index + '</div><div class="ui-inspect-target-desc">' + escapeHtml(desc) + (changedProps ? '<span class="ui-inspect-target-props">changed: ' + escapeHtml(changedProps) + '</span>' : '') + '</div>';
      item.addEventListener('click', () => {
        cssDebugSession.activeTargetId = key;
        activeElement = target.element;
        highlightElement(target.element);
        updateCssDebugMiniBar();
        updateCssDebugOverlay();
        const drawer = document.getElementById(CSS_DEBUG_CONTROLS_DRAWER_ID);
        if (drawer) {
          const drawerPanel = { dataset: {}, querySelector: (sel) => drawer.querySelector(sel), querySelectorAll: (sel) => drawer.querySelectorAll(sel) };
          renderCssDebugControls(drawerPanel);
        }
        renderCssDebugTargetListInto(container);
      });
      container.appendChild(item);
    }
    if (index === 0) {
      container.innerHTML = '<div class="ui-inspect-target-empty">暂无目标</div>';
    }
  }

  function openCssDebugSendDialog() {
    if (cssDebugSession && cssDebugSession.sent) {
      showToast('CSS diff 已发送，不能重复发送。', 'idle');
      return;
    }
    let dialog = document.getElementById(CSS_DEBUG_SEND_DIALOG_ID);
    if (dialog) {
      dialog.remove();
      return;
    }
    closeCssDebugFloatingPanels('send');
    const changed = cssDebugChangedCount();
    dialog = document.createElement('div');
    dialog.id = CSS_DEBUG_SEND_DIALOG_ID;
    dialog.innerHTML = [
      '<div class="ui-inspect-send-head"><span>发送 CSS diff</span><button type="button" data-send-action="close" aria-label="关闭">×</button></div>',
      '<div class="ui-inspect-send-status">' + changed + ' 个元素有改动</div>',
      '<label class="ui-inspect-field-label" for="ui-inspect-css-note-dialog">补充说明，可选</label>',
      '<textarea id="ui-inspect-css-note-dialog" placeholder="例如：保持按钮高度不变，只让视觉更柔和"></textarea>',
      '<div class="ui-inspect-send-actions">',
        '<button type="button" data-send-action="cancel">取消</button>',
        '<button type="button" data-send-action="confirm" data-primary="true">发送 CSS diff</button>',
      '</div>'
    ].join('');
    document.body.appendChild(dialog);

    ['pointerdown','mousedown','mouseup','click','dblclick','mousemove'].forEach((type) => {
      dialog.addEventListener(type, (event) => event.stopPropagation());
    });

    dialog.querySelector('[data-send-action="close"]').addEventListener('click', () => dialog.remove());
    dialog.querySelector('[data-send-action="cancel"]').addEventListener('click', () => dialog.remove());
    dialog.querySelector('[data-send-action="confirm"]').addEventListener('click', () => {
      const textarea = dialog.querySelector('textarea');
      const payload = makeCssDebugPayload(textarea?.value.trim() || '');
      if (!payload) {
        showToast('请先选择一个元素。', 'failed');
        return;
      }
      if (!payload.cssDebug.changedTargetCount) {
        showToast('还没有样式改动，先调整一个属性再发送。', 'failed');
        return;
      }
      submitPayload(payload).then(() => {
        if (cssDebugSession) cssDebugSession.sent = true;
        dialog.remove();
        updateCssDebugMiniBar();
        setEnabled(false);
        removeCssDebugOverlay();
        closeCssDebugFloatingPanels();
        showToast('CSS diff 已发送（' + payload.cssDebug.changedTargetCount + ' 个元素）', 'sent');
      }).catch((err) => {
        setDianaState('failed', 2200);
        showToast(friendlyError(err, 'send'), 'failed');
      });
    });

    const textarea = dialog.querySelector('textarea');
    if (textarea) textarea.focus();
  }

  function renderCssDebugTargetList() {
    const panel = cssDebugPanel();
    if (!panel || !cssDebugSession) return;
    const listEl = panel.querySelector('.ui-inspect-css-target-list');
    if (!listEl) return;
    const targets = Array.from(cssDebugSession.targets.values());
    if (targets.length <= 1) {
      listEl.innerHTML = '';
      return;
    }
    const changedCount = targets.filter((t) => t.activeProperties && t.activeProperties.size > 0).length;
    listEl.innerHTML = '<div class="ui-inspect-css-target-summary">' +
      escapeHtml(targets.length + ' 个元素 · ' + changedCount + ' 个已修改') +
      '</div>' +
      targets.map((t) => {
        const isActive = t.id === cssDebugSession.activeTargetId;
        const hasChanges = t.activeProperties && t.activeProperties.size > 0;
        return '<button type="button" data-css-target-id="' + escapeHtml(t.id) + '" class="ui-inspect-css-target-btn' +
          (isActive ? ' ui-inspect-css-target-active' : '') +
          (hasChanges ? ' ui-inspect-css-target-changed' : '') +
          '">' +
          '<span class="ui-inspect-css-target-tag">' + escapeHtml(t.selection.dom.tagName.toLowerCase()) + '</span>' +
          '<span class="ui-inspect-css-target-text">' + escapeHtml((t.selection.dom.text || '').slice(0, 30)) + '</span>' +
          '</button>';
      }).join('');
    Array.from(listEl.querySelectorAll('[data-css-target-id]')).forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-css-target-id');
        if (!targetId || !cssDebugSession) return;
        cssDebugSession.activeTargetId = targetId;
        const target = cssDebugSession.targets.get(targetId);
        if (target?.element) {
          activeElement = target.element;
          highlightElement(target.element);
        }
        const panel = cssDebugPanel();
        if (panel) {
          const targetEl = panel.querySelector('.ui-inspect-target');
          if (targetEl) targetEl.textContent = describeSelection(target.selection);
          renderCssDebugControls(panel);
          placePanel(panel);
        }
        renderCssDebugTargetList();
        updateCssDebugOverlay();
      });
    });
  }
`;
