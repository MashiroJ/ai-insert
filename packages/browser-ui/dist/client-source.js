import { runtimeMonitorClientSource } from './client-modules/runtime-monitor-source.js';
import { dianaClientSource } from './client-modules/diana-source.js';
import { selectionClientSource } from './client-modules/selection-source.js';
import { styleClientSource } from './client-modules/style-source.js';
import { taskPanelClientSource } from './client-modules/task-panel-source.js';
import { sessionClientSource } from './client-modules/session-source.js';
export function clientSource(options) {
    return `(() => {
  const DAEMON_URL = ${JSON.stringify(options.daemonUrl)};
  const PROJECT_ROOT = ${JSON.stringify(options.root)};
  const STYLE_ID = 'ui-inspect-style';
  const BOX_ID = 'ui-inspect-box';
  const TOGGLE_ID = 'ui-inspect-toggle';
  const MENU_ID = 'ui-inspect-menu';
  const PANEL_ID = 'ui-inspect-panel';
  const TOAST_ID = 'ui-inspect-toast';
  const BATCH_SIDEBAR_ID = 'ui-inspect-batch-sidebar';
  const CSS_DEBUG_OVERLAY_ID = 'ui-inspect-css-overlay';
  const LAST_SESSION_KEY = 'ui-inspect:last-session';
  const DIANA_POSITION_KEY = 'ui-inspect:diana-position';
  const SOURCE_EDITOR_KEY = 'ui-inspect:source-editor';
  const DIANA_SPRITE_URL = ${JSON.stringify(options.dianaSpriteUrl ?? '/@ui-inspect/diana.webp')};
  let enabled = false;
  let hovered = null;
  let activeElement = null;
  let activeSessionId = localStorage.getItem(LAST_SESSION_KEY) || null;
  let activePanelSessionId = null;
  let activeSessionData = null;
  let reselectSessionId = null;
  let sessionEvents = null;
  let selectedTargets = [];
  let selectionMode = 'batch';
  let activeTaskMode = 'batch';
  let dianaResetTimer = null;
  let dianaHintTimer = null;
  let menuHideTimer = null;
  let dianaDrag = null;
  let suppressDianaClick = false;
  let batchSidebarCollapsed = false;
  let selectedRuntimeEventIds = new Set();
  let troubleshootRuntimeSnapshot = [];
  let runtimePrivacyConfirmed = false;
  let cssDebugSession = null;
  let cssDebugElementIds = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  let cssDebugNextElementId = 1;

${styleClientSource}

  ${dianaClientSource}

    function ensureBox() {
    let box = document.getElementById(BOX_ID);
    if (!box) {
      box = document.createElement('div');
      box.id = BOX_ID;
      document.body.appendChild(box);
    }
    return box;
  }

  function setEnabled(next) {
    enabled = next;
    document.documentElement.toggleAttribute('data-ui-inspect', enabled);
    ensureToggle();
    setDianaState(enabled ? 'selecting' : 'idle');
    if (!enabled && !activeElement) ensureBox().style.display = 'none';
    if (!enabled && activeElement) highlightElement(activeElement);
  }

${runtimeMonitorClientSource({ eventLimit: 20, textLimit: 2000 })}

  function isOwnNode(el) {
    return el && (el.id === STYLE_ID || el.id === BOX_ID || el.id === TOGGLE_ID || el.id === MENU_ID || el.id === PANEL_ID || el.id === TOAST_ID || el.id === BATCH_SIDEBAR_ID || el.id === CSS_DEBUG_OVERLAY_ID || (el.closest && (el.closest('#' + PANEL_ID) || el.closest('#' + MENU_ID) || el.closest('#' + TOGGLE_ID) || el.closest('#' + TOAST_ID) || el.closest('#' + BATCH_SIDEBAR_ID) || el.closest('#' + CSS_DEBUG_OVERLAY_ID))));
  }

  function elementFromNode(node) {
    if (!node) return null;
    if (node.nodeType === 1) return node;
    return node.parentElement || null;
  }

  function updateHover(el) {
    const element = elementFromNode(el);
    if (!enabled || !element || isOwnNode(element)) return;
    hovered = element;
    highlightElement(element);
  }

  function highlightElement(el) {
    if (!el?.getBoundingClientRect) return;
    const rect = el.getBoundingClientRect();
    const box = ensureBox();
    box.style.display = 'block';
    box.style.left = Math.round(rect.left) + 'px';
    box.style.top = Math.round(rect.top) + 'px';
    box.style.width = Math.round(rect.width) + 'px';
    box.style.height = Math.round(rect.height) + 'px';
  }

  function clearHighlight() {
    activeElement = null;
    hovered = null;
    ensureBox().style.display = 'none';
  }

${selectionClientSource}

    async function submitPayload(payload) {
    const resp = await fetch(DAEMON_URL.replace(/\\/$/, '') + '/selection', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error(await resp.text());
    activeSessionId = payload.sessionId;
    localStorage.setItem(LAST_SESSION_KEY, activeSessionId);
    setDianaState('sent');
    startSessionStream(payload.sessionId);
    renderSession(payload.sessionId).catch(() => {});
  }

  async function updateSessionStatus(sessionId, status) {
    const resp = await fetch(DAEMON_URL.replace(/\\/$/, '') + '/sessions/' + encodeURIComponent(sessionId) + '/status', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!resp.ok) throw new Error(await resp.text());
  }

  async function fetchEditors() {
    const resp = await fetch(DAEMON_URL.replace(/\\/$/, '') + '/editors', { cache: 'no-store' });
    if (!resp.ok) throw new Error(await resp.text());
    return await resp.json();
  }

  async function openSource(selection, button, editor) {
    if (!selection?.source?.file) return;
    const resp = await fetch(DAEMON_URL.replace(/\\/$/, '') + '/open-source', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source: selection.source, editor })
    });
    if (!resp.ok) throw new Error(await resp.text());
    if (button) button.textContent = '已打开';
  }

  async function copySource(selection, button) {
    const source = selection?.source;
    if (!source?.file) return;
    const suffix = source.line ? ':' + source.line + (source.column ? ':' + source.column : '') : '';
    const text = source.file + suffix;
    await navigator.clipboard?.writeText(text);
    if (button) button.textContent = '已复制';
  }

  function showToast(message, state) {
    const existing = document.getElementById(TOAST_ID);
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.textContent = message;
    document.body.appendChild(toast);
    if (state) setDianaState(state, 1800);
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 2200);
  }

  function friendlyError(error, action) {
    const message = error && error.message ? error.message : String(error || '');
    if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
      return 'UI Inspect 本地服务未连接。请先在 AI 对话里执行：启用 ui-inspect。';
    }
    if (action === 'source') return '打开源码失败：' + message;
    if (action === 'history') return '暂时无法读取历史会话，本地服务可能还没启动。';
    return '发送失败：' + message;
  }

  function removePanel() {
    closeSessionStream();
    cancelModeMenuClose();
    const menu = document.getElementById(MENU_ID);
    if (menu) menu.remove();
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      existing.dispatchEvent(new CustomEvent('ui-inspect-cleanup'));
      existing.remove();
    }
    const sidebar = document.getElementById(BATCH_SIDEBAR_ID);
    if (sidebar) sidebar.remove();
  }

  function closeDebugPanel() {
    resetAllCssDebugTargets();
    removeCssDebugOverlay();
    document.documentElement.removeAttribute('data-ui-inspect-css-debug');
    removePanel();
    setEnabled(false);
    activePanelSessionId = null;
    activeSessionData = null;
    reselectSessionId = null;
    selectedTargets = [];
    selectedRuntimeEventIds = new Set();
    troubleshootRuntimeSnapshot = [];
    cssDebugSession = null;
    if (Array.isArray(runtimeEvents)) runtimeEvents.length = 0;
    selectionMode = 'batch';
    activeTaskMode = 'batch';
    batchSidebarCollapsed = false;
    setDianaState('idle');
    clearHighlight();
  }

  function openModeMenu() {
    if (enabled) return;
    cancelModeMenuClose();
    hideDianaHint();
    const existingMenu = document.getElementById(MENU_ID);
    if (existingMenu) return;
    const existingPanel = document.getElementById(PANEL_ID);
    const existingSidebar = document.getElementById(BATCH_SIDEBAR_ID);
    if (existingPanel || existingSidebar) return;
    setEnabled(false);
    setDianaState('standby');
    const menu = document.createElement('div');
    menu.id = MENU_ID;
    menu.innerHTML = [
      '<div class="ui-inspect-menu-head"><div class="ui-inspect-menu-title">Diana</div><button type="button" class="ui-inspect-menu-close" data-action="close" aria-label="关闭">×</button></div>',
      '<div class="ui-inspect-menu-actions">',
      '<button type="button" data-mode="source" aria-label="源码线索">' + sourceIcon() + '<span class="ui-inspect-menu-desc">源码线索</span></button>',
      '<button type="button" data-mode="troubleshoot" aria-label="问题排查：选择可能报错的组件并确认 console 日志">' + troubleshootIcon() + '<span class="ui-inspect-menu-desc">问题排查</span></button>',
      '<button type="button" data-mode="css-debug" aria-label="CSS 调试：选择元素后实时调整样式">' + cssDebugIcon() + '<span class="ui-inspect-menu-desc">CSS 调试</span></button>',
      '<button type="button" data-mode="single" aria-label="局部调整">' + editIcon() + '<span class="ui-inspect-menu-desc">局部调整</span></button>',
      '<button type="button" data-mode="batch" aria-label="批量调整">' + batchIcon() + '<span class="ui-inspect-menu-desc">批量调整</span></button>',
      '<span class="ui-inspect-menu-divider" aria-hidden="true"></span>',
      '<button type="button" class="ui-inspect-menu-secondary" data-action="history" aria-label="历史记录">' + historyIcon() + '<span class="ui-inspect-menu-desc">历史记录</span></button>',
      '</div>',
    ].join('');
    document.body.appendChild(menu);
    positionModeMenu(menu);
    menu.addEventListener('mouseenter', () => cancelModeMenuClose());
    menu.addEventListener('mouseleave', () => scheduleModeMenuClose());
    ['pointerdown','mousedown','mouseup','click','dblclick','mousemove'].forEach((type) => {
      menu.addEventListener(type, (event) => event.stopPropagation());
    });
    Array.from(menu.querySelectorAll('[data-mode]')).forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.getAttribute('data-mode') || 'batch';
        beginSelectionMode(mode);
      });
    });
    menu.querySelector('[data-action="history"]').addEventListener('click', () => openHistoryPanel());
  }

  function positionModeMenu(menu) {
    const button = document.getElementById(TOGGLE_ID);
    if (!button || !menu) return;
    const rect = button.getBoundingClientRect();
    const menuWidth = 48;
    const menuHeight = menu.offsetHeight || 232;
    const margin = 8;
    const x = Math.min(Math.max(margin, rect.left + rect.width / 2 - menuWidth / 2), window.innerWidth - menuWidth - margin);
    const preferredY = rect.top - menuHeight - 8;
    const fallbackY = rect.bottom + 8;
    const y = preferredY >= margin
      ? preferredY
      : Math.min(Math.max(margin, fallbackY), window.innerHeight - menuHeight - margin);
    menu.style.left = Math.round(x) + 'px';
    menu.style.top = Math.round(y) + 'px';
    menu.style.right = 'auto';
    menu.style.bottom = 'auto';
    menu.dataset.side = x < 100 ? 'right' : 'left';
  }

  function sourceIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7V5a1 1 0 0 1 1-1h2"/><path d="M17 4h2a1 1 0 0 1 1 1v2"/><path d="M20 17v2a1 1 0 0 1-1 1h-2"/><path d="M7 20H5a1 1 0 0 1-1-1v-2"/><path d="m9 9-3 3 3 3"/><path d="m15 9 3 3-3 3"/><path d="m13 8-2 8"/></svg>';
  }

  function editIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/><path d="m14 6 4 4"/></svg>';
  }

  function troubleshootIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 2 1.8 2h4.4L16 2"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M12 17v3"/><path d="M4 13H2"/><path d="M22 13h-2"/><path d="m5 5 2 2"/><path d="m19 5-2 2"/><rect x="6" y="5" width="12" height="13" rx="6"/></svg>';
  }

  function cssDebugIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16"/><path d="M6 16l8.5-8.5a2.1 2.1 0 0 1 3 3L9 19H6z"/><path d="m13 6 5 5"/><path d="M4 4h6"/><path d="M4 8h3"/></svg>';
  }

  function batchIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="5" rx="1"/><rect x="4" y="15" width="16" height="5" rx="1"/><path d="M7 9v6"/><path d="M17 9v6"/></svg>';
  }

  function historyIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></svg>';
  }

  function beginSelectionMode(mode) {
    removePanel();
    selectionMode = mode;
    activeTaskMode = mode === 'single' ? 'single' : (mode === 'troubleshoot' ? 'troubleshoot' : (mode === 'css-debug' ? 'css-debug' : 'batch'));
    if (mode === 'single' || mode === 'batch' || mode === 'troubleshoot' || mode === 'css-debug') {
      activePanelSessionId = 'session-' + Date.now();
      activeSessionData = null;
      selectedTargets = [];
      selectedRuntimeEventIds = new Set();
      runtimePrivacyConfirmed = false;
      cssDebugSession = null;
    }
    setEnabled(true);
    if (mode === 'source') showToast('点击页面元素，Diana 会先确认源码线索。');
    if (mode === 'troubleshoot') showToast('点击可能报错的组件，Diana 会附带可确认的 console 线索。');
    if (mode === 'css-debug') showToast('点击一个元素，Diana 会打开 CSS 调试面板。');
    if (mode === 'single') showToast('点击一个需要局部调整的元素。');
    if (mode === 'batch') {
      batchSidebarCollapsed = window.innerWidth <= 520;
      showToast('批量调整已打开，连续点击页面元素即可添加目标。');
      openBatchSidebar();
    }
  }

  function describeSelection(selection) {
    if (!selection) return '未选择元素，点击“选择”后在页面上框选。';
    return selectionTitle(selection);
  }

  function basename(value) {
    return String(value || '').split(/[\\\\/]/).filter(Boolean).pop() || '';
  }

  function relativePath(value) {
    const file = String(value || '');
    const root = String(PROJECT_ROOT || '').replace(/[\\\\/]$/, '');
    if (root && file.startsWith(root + '/')) return file.slice(root.length + 1);
    if (root && file.startsWith(root + '\\\\')) return file.slice(root.length + 1);
    return file;
  }

  function sourceLabel(selection) {
    const source = selection?.source;
    if (!source?.file) return '';
    const suffix = source.line ? ':' + source.line + (source.column ? ':' + source.column : '') : '';
    return relativePath(source.file) + suffix;
  }

  function selectionTitle(selection) {
    if (!selection) return '未选择元素';
    const readable = readableDomTitle(selection);
    if (readable) return readable;
    if (selection.vue?.componentName) return selection.vue.componentName;
    if (selection.source?.file) return basename(selection.source.file);
    if (selection.dom?.tagName) {
      const id = selection.dom.id ? '#' + selection.dom.id : '';
      const text = selection.dom.text ? ' · ' + selection.dom.text.slice(0, 28) : '';
      return selection.dom.tagName + id + text;
    }
    return '已选择 DOM 元素';
  }

  function readableDomTitle(selection) {
    const dom = selection?.dom || {};
    const tag = String(dom.tagName || '').toLowerCase();
    const html = String(dom.outerHtml || '');
    const attrs = attrsFromHtml(html);
    const text = cleanText(dom.text);
    const placeholder = cleanText(attrs.placeholder || attrValueFromHtml(html, 'placeholder'));
    const aria = cleanText(attrs['aria-label'] || attrValueFromHtml(html, 'aria-label'));
    const title = cleanText(attrs.title);
    const name = cleanText(attrs.name);
    const label = placeholder || aria || title || name;
    if (['input','textarea','select'].includes(tag)) {
      const kind = tag === 'textarea' ? '文本域' : (tag === 'select' ? '选择框' : '输入框');
      return label ? kind + ' · ' + label : kind;
    }
    if (tag === 'button' || attrs.role === 'button') return text ? '按钮 · ' + text.slice(0, 28) : '按钮';
    if (tag === 'a') return text ? '链接 · ' + text.slice(0, 28) : '链接';
    if (label) return tagNameText(tag) + ' · ' + label;
    if (text && text.length <= 40) return tagNameText(tag) + ' · ' + text;
    return '';
  }

  function attrsFromHtml(html) {
    const attrs = {};
    const match = html.match(/^<[^\\s/>]+\\s+([^>]*)>/);
    if (!match) return attrs;
    const source = match[1] || '';
    source.replace(/([:@\\w-]+)(?:\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+)))?/g, (_all, key, a, b, c) => {
      attrs[String(key).toLowerCase()] = a || b || c || '';
      return '';
    });
    return attrs;
  }

  function attrValueFromHtml(html, name) {
    const safeName = name.replace(/[-/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&');
    const pattern = new RegExp('\\\\s' + safeName + '\\\\s*=\\\\s*(?:"([^"]*)"|\\'([^\\']*)\\'|([^\\\\s"\\'=<>]+))', 'i');
    const match = String(html || '').match(pattern);
    return match ? (match[1] || match[2] || match[3] || '') : '';
  }

  function cleanText(value) {
    return String(value || '').replace(/\\s+/g, ' ').trim();
  }

  function tagNameText(tag) {
    return ({
      div: '区域',
      section: '区域',
      header: '头部',
      main: '主体',
      footer: '底部',
      form: '表单',
      img: '图片',
      span: '文本',
      p: '文本'
    })[tag] || (tag || '元素');
  }

${taskPanelClientSource}

    function placePanel(panel) {
    if (!panel) return;
    const anchor = document.getElementById(TOGGLE_ID);
    const margin = 12;
    const gap = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const anchorRect = anchor?.getBoundingClientRect?.() || {
      left: viewportWidth - 84,
      right: viewportWidth - 12,
      top: viewportHeight - 90,
      bottom: viewportHeight - 12,
      width: 72,
      height: 78
    };
    panel.style.left = '0px';
    panel.style.top = '0px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.dataset.placement = 'left-top';
    const panelWidth = panel.offsetWidth || Math.min(420, viewportWidth - margin * 2);
    const panelHeight = panel.offsetHeight || Math.min(360, viewportHeight - margin * 2);
    const candidates = [
      { name: 'left-top', left: anchorRect.left - panelWidth - gap, top: anchorRect.bottom - panelHeight },
      { name: 'left-bottom', left: anchorRect.left - panelWidth - gap, top: anchorRect.top },
      { name: 'right-top', left: anchorRect.right + gap, top: anchorRect.bottom - panelHeight },
      { name: 'right-bottom', left: anchorRect.right + gap, top: anchorRect.top }
    ];
    const scored = candidates.map((item) => {
      const overflowX = Math.max(0, margin - item.left) + Math.max(0, item.left + panelWidth - (viewportWidth - margin));
      const overflowY = Math.max(0, margin - item.top) + Math.max(0, item.top + panelHeight - (viewportHeight - margin));
      return { ...item, score: overflowX + overflowY * 1.4 };
    }).sort((a, b) => a.score - b.score);
    const best = scored[0];
    const left = Math.min(Math.max(margin, best.left), Math.max(margin, viewportWidth - panelWidth - margin));
    const top = Math.min(Math.max(margin, best.top), Math.max(margin, viewportHeight - panelHeight - margin));
    panel.style.left = Math.round(left) + 'px';
    panel.style.top = Math.round(top) + 'px';
    panel.dataset.placement = best.name;
  }

  async function openSourceConfirmPanel(selection) {
    removePanel();
    setEnabled(false);
    setDianaState('idle');
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    const title = selectionTitle(selection);
    const source = sourceLabel(selection);
    panel.innerHTML = [
      '<div class="ui-inspect-head"><div class="ui-inspect-title">Diana · 源码线索</div><button type="button" class="ui-inspect-close" data-action="close" aria-label="关闭">×</button></div>',
      '<div class="ui-inspect-target">' + escapeHtml(title) + '</div>',
      '<div class="ui-inspect-source-path">' + escapeHtml(source) + '</div>',
      '<label class="ui-inspect-field-label">选择打开方式</label>',
      '<div class="ui-inspect-editor-list">正在检测本机 IDE...</div>',
      '<div class="ui-inspect-actions">',
        '<div class="ui-inspect-actions-left"><button type="button" data-action="copy-source">复制路径</button></div>',
        '<div class="ui-inspect-actions-right"><button type="button" data-action="cancel">取消</button><button type="button" data-primary="true" data-action="open-source">打开</button></div>',
      '</div>'
    ].join('');
    document.body.appendChild(panel);
    placePanel(panel);
    ['pointerdown','mousedown','mouseup','click','dblclick','mousemove'].forEach((type) => {
      panel.addEventListener(type, (event) => event.stopPropagation());
    });
    const list = panel.querySelector('.ui-inspect-editor-list');
    const openButton = panel.querySelector('[data-action="open-source"]');
    const copyButton = panel.querySelector('[data-action="copy-source"]');
    const cancelButton = panel.querySelector('[data-action="cancel"]');
    const closeButton = panel.querySelector('[data-action="close"]');
    const savedEditor = localStorage.getItem(SOURCE_EDITOR_KEY) || '';
    try {
      const payload = await fetchEditors();
      const editors = Array.isArray(payload.editors) ? payload.editors : [];
      const available = editors.filter((editor) => editor && editor.available);
      const preferred = available.find((editor) => editor.id === savedEditor)
        || available.find((editor) => editor.id === payload.preferred)
        || available[0];
      if (list) {
        list.innerHTML = (available.length ? available : [{ id: 'open', label: '系统默认', available: true }]).map((editor, index) => (
          '<label class="ui-inspect-editor-option">' +
            '<input type="radio" name="ui-inspect-editor" value="' + escapeHtml(editor.id) + '"' + ((preferred?.id || 'open') === editor.id || (!preferred && index === 0) ? ' checked' : '') + ' />' +
            '<span>' + escapeHtml(editor.label || editor.id) + '</span>' +
          '</label>'
        )).join('');
      }
    } catch {
      if (list) list.innerHTML = '<label class="ui-inspect-editor-option"><input type="radio" name="ui-inspect-editor" value="open" checked /><span>系统默认</span></label>';
    }
    const close = () => {
      const existing = document.getElementById(PANEL_ID);
      if (existing) existing.remove();
      setDianaState('idle');
      clearHighlight();
    };
    openButton.addEventListener('click', () => {
      const editor = panel.querySelector('input[name="ui-inspect-editor"]:checked')?.value || '';
      if (editor) localStorage.setItem(SOURCE_EDITOR_KEY, editor);
      openButton.textContent = '打开中';
      setDianaState('working');
      openSource(selection, openButton, editor).then(() => {
        showToast('已打开源码：' + sourceLabel(selection), 'done');
        close();
      }).catch((err) => {
        openButton.textContent = '打开';
        showToast(friendlyError(err, 'source'), 'failed');
      });
    });
    copyButton.addEventListener('click', () => copySource(selection, copyButton).catch(() => { copyButton.textContent = '复制失败'; }));
    cancelButton.addEventListener('click', close);
    closeButton.addEventListener('click', close);
  }

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

  function removeCssDebugOverlay() {
    const overlay = document.getElementById(CSS_DEBUG_OVERLAY_ID);
    if (overlay) overlay.remove();
    const target = cssDebugActiveTarget();
    if (target) target.drag = null;
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

  function updateCssDebugOverlay() {
    const panel = cssDebugPanel();
    const target = cssDebugActiveTarget();
    if (!target?.element || !document.documentElement.hasAttribute('data-ui-inspect-css-debug') || panel?.dataset?.sent === 'true') {
      removeCssDebugOverlay();
      return;
    }
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
  }

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
    const overlay = document.getElementById(CSS_DEBUG_OVERLAY_ID);
    if (!overlay || !rect) return;
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
  }

  function beginCssDebugInteraction(event) {
    const target = cssDebugActiveTarget();
    if (!target?.element) return;
    const handle = event.currentTarget?.getAttribute?.('data-css-debug-handle') || 'move';
    const rect = cssDebugRect(target.element);
    const inlineTransform = target.element.style.getPropertyValue('transform') || '';
    const translate = cssDebugTranslateFromTransform(inlineTransform);
    target.drag = {
      handle,
      rectBefore: rect,
      startX: event.clientX,
      startY: event.clientY,
      width: rect.width,
      height: rect.height,
      transformBase: cssDebugTransformBase(inlineTransform),
      translateX: translate.x,
      translateY: translate.y,
      lastDx: 0,
      lastDy: 0
    };
    try { event.currentTarget?.setPointerCapture?.(event.pointerId); } catch {}
    document.addEventListener('pointermove', moveCssDebugInteraction, true);
    document.addEventListener('pointerup', endCssDebugInteraction, true);
    document.addEventListener('pointercancel', cancelCssDebugInteraction, true);
    event.preventDefault();
  }

  function moveCssDebugInteraction(event) {
    const drag = cssDebugActiveTarget()?.drag;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    drag.lastDx = dx;
    drag.lastDy = dy;
    const panel = cssDebugPanel();
    const h = drag.handle;
    const affectsLeft = h === 'nw' || h === 'w' || h === 'sw';
    const affectsTop = h === 'nw' || h === 'n' || h === 'ne';
    const affectsRight = h === 'ne' || h === 'e' || h === 'se';
    const affectsBottom = h === 'sw' || h === 's' || h === 'se';
    if (h === 'move') {
      const transform = cssDebugPreviewTransform(drag.transformBase, drag.translateX + dx, drag.translateY + dy);
      applyCssDebugValue('transform', transform);
      moveCssDebugOverlayPreview(drag.rectBefore, dx, dy);
    } else {
      let nextWidth = drag.width;
      let nextHeight = drag.height;
      let effectiveDx = 0;
      let effectiveDy = 0;
      let translateX = drag.translateX;
      let translateY = drag.translateY;
      if (affectsRight) {
        nextWidth = Math.max(1, Math.round(drag.width + dx));
        const value = nextWidth + 'px';
        applyCssDebugValue('width', value);
        syncCssDebugControl(panel, 'width', value);
      }
      if (affectsLeft) {
        const maxDx = drag.width - 1;
        effectiveDx = Math.min(dx, maxDx);
        nextWidth = Math.max(1, Math.round(drag.width - effectiveDx));
        const value = nextWidth + 'px';
        applyCssDebugValue('width', value);
        syncCssDebugControl(panel, 'width', value);
        translateX = drag.translateX + effectiveDx;
      }
      if (affectsBottom) {
        nextHeight = Math.max(1, Math.round(drag.height + dy));
        const value = nextHeight + 'px';
        applyCssDebugValue('height', value);
        syncCssDebugControl(panel, 'height', value);
      }
      if (affectsTop) {
        const maxDy = drag.height - 1;
        effectiveDy = Math.min(dy, maxDy);
        nextHeight = Math.max(1, Math.round(drag.height - effectiveDy));
        const value = nextHeight + 'px';
        applyCssDebugValue('height', value);
        syncCssDebugControl(panel, 'height', value);
        translateY = drag.translateY + effectiveDy;
      }
      if (affectsLeft || affectsTop) {
        const transform = cssDebugPreviewTransform(drag.transformBase, translateX, translateY);
        applyCssDebugValue('transform', transform);
      }
      const previewDx = affectsLeft ? effectiveDx : 0;
      const previewDy = affectsTop ? effectiveDy : 0;
      moveCssDebugOverlayPreview(drag.rectBefore, previewDx, previewDy, nextWidth, nextHeight);
    }
    if (panel) {
      if (cssDebugActiveTarget()?.changedOnly && drag.handle !== 'move') renderCssDebugControls(panel);
      else renderCssDebugDiff(panel);
    }
    event.preventDefault();
  }

  function finishCssDebugInteraction(cancelled) {
    const target = cssDebugActiveTarget();
    const drag = target?.drag;
    if (!drag) return;
    document.removeEventListener('pointermove', moveCssDebugInteraction, true);
    document.removeEventListener('pointerup', endCssDebugInteraction, true);
    document.removeEventListener('pointercancel', cancelCssDebugInteraction, true);
    target.drag = null;
    if (cancelled) return;
    const rectAfter = cssDebugRect(target.element);
    const delta = {
      x: Math.round((rectAfter.x - drag.rectBefore.x) * 10) / 10,
      y: Math.round((rectAfter.y - drag.rectBefore.y) * 10) / 10,
      width: Math.round((rectAfter.width - drag.rectBefore.width) * 10) / 10,
      height: Math.round((rectAfter.height - drag.rectBefore.height) * 10) / 10
    };
    const interaction = {
      type: drag.handle === 'move' ? 'move' : 'resize',
      handle: drag.handle,
      properties: drag.handle === 'move' ? ['transform'] : (drag.handle === 'e' ? ['width'] : (drag.handle === 'w' ? ['width', 'transform'] : (drag.handle === 's' ? ['height'] : (drag.handle === 'n' ? ['height', 'transform'] : (drag.handle === 'se' ? ['width', 'height'] : ['width', 'height', 'transform']))))),
      rectBefore: drag.rectBefore,
      rectAfter,
      delta,
      strategy: drag.handle === 'move' || drag.handle === 'nw' || drag.handle === 'w' || drag.handle === 'sw' || drag.handle === 'n' || drag.handle === 'ne' ? 'transform-preview' : 'inline-style',
      timestamp: Date.now()
    };
    target.interactions = [...(target.interactions || []), interaction].slice(-8);
    target.primaryInteraction = interaction;
    const panel = cssDebugPanel();
    if (panel) renderCssDebugControls(panel);
  }

  function endCssDebugInteraction() {
    finishCssDebugInteraction(false);
  }

  function cancelCssDebugInteraction() {
    finishCssDebugInteraction(true);
  }

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

  function makeCssDebugPayload(instruction) {
    if (!cssDebugSession) return null;
    const changedTargets = [];
    for (const target of cssDebugSession.targets.values()) {
      const previewStyles = target.previewStyles && Object.keys(target.previewStyles).length
        ? { ...cssDebugComputedStyles(target.element), ...target.previewStyles }
        : {};
      const changedStyles = cssDebugChangedStyles(target.originalStyles, previewStyles, target.activeProperties);
      if (Object.keys(changedStyles).length === 0) continue;
      const computedEffects = cssDebugComputedEffects(target.originalStyles, previewStyles, target.activeProperties);
      changedTargets.push({
        id: target.id,
        selection: target.selection,
        selectedElement: target.selection.dom,
        originalStyles: target.originalStyles,
        originalInlineStyles: target.originalInlineStyles,
        previewStyles,
        changedStyles,
        computedEffects,
        layoutContext: cssDebugLayoutContextFor(target),
        interactions: target.interactions || [],
        primaryInteraction: target.primaryInteraction || null,
        sourceHints: target.selection.sourceHints,
      });
    }
    if (!changedTargets.length) return null;
    let primaryTarget = cssDebugSession.targets.get(cssDebugSession.activeTargetId);
    const activeHasChanges = primaryTarget && Object.keys(cssDebugChangedStyles(primaryTarget.originalStyles, primaryTarget.previewStyles && Object.keys(primaryTarget.previewStyles).length ? { ...cssDebugComputedStyles(primaryTarget.element), ...primaryTarget.previewStyles } : {}, primaryTarget.activeProperties)).length > 0;
    if (!activeHasChanges) {
      primaryTarget = cssDebugSession.targets.get(changedTargets[changedTargets.length - 1].id) || primaryTarget;
    }
    const primary = primaryTarget?.selection;
    if (!primary) return null;
    const primaryPreviewStyles = primaryTarget.previewStyles && Object.keys(primaryTarget.previewStyles).length
      ? { ...cssDebugComputedStyles(primaryTarget.element), ...primaryTarget.previewStyles }
      : {};
    const primaryChangedStyles = cssDebugChangedStyles(primaryTarget.originalStyles, primaryPreviewStyles, primaryTarget.activeProperties);
    const primaryComputedEffects = cssDebugComputedEffects(primaryTarget.originalStyles, primaryPreviewStyles, primaryTarget.activeProperties);
    const cssDebug = {
      selection: primary,
      selectedElement: primary.dom,
      originalStyles: primaryTarget.originalStyles,
      previewStyles: primaryPreviewStyles,
      changedStyles: primaryChangedStyles,
      computedEffects: primaryComputedEffects,
      layoutContext: cssDebugLayoutContextFor(primaryTarget),
      interactions: primaryTarget.interactions || [],
      primaryInteraction: primaryTarget.primaryInteraction || null,
      batch: true,
      primaryTargetId: primaryTarget.id,
      changedTargetCount: changedTargets.length,
      targets: changedTargets,
      session: cssDebugSession.sessionInfo,
    };
    return {
      ...primary,
      id: 'selection-' + Date.now(),
      sessionId: activePanelSessionId,
      timestamp: Date.now(),
      mode: 'css-debug',
      instruction: 'CSS 调试（' + changedTargets.length + ' 个元素）：请根据浏览器中预览的样式 diff，结合源码线索把改动落到项目样式中。优先修改源码里的 class/style，不要直接照搬 inline style，注意布局影响范围。\\n\\n用户补充：' + (instruction || '无'),
      note: instruction || '',
      targets: changedTargets.map((t) => ({
        id: t.id,
        note: '',
        selection: t.selection,
        cssDebug: t,
      })),
      cssDebug
    };
  }

  function makePanelDraggable(panel) {
    const handle = panel.querySelector('.ui-inspect-head');
    if (!handle) return;
    let drag = null;
    handle.addEventListener('pointerdown', (event) => {
      if (event.target?.closest?.('button')) return;
      const rect = panel.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      handle.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    handle.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const left = Math.min(Math.max(8, drag.left + event.clientX - drag.x), window.innerWidth - panel.offsetWidth - 8);
      const top = Math.min(Math.max(8, drag.top + event.clientY - drag.y), window.innerHeight - panel.offsetHeight - 8);
      panel.style.left = Math.round(left) + 'px';
      panel.style.top = Math.round(top) + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    });
    handle.addEventListener('pointerup', () => { drag = null; });
    handle.addEventListener('pointercancel', () => { drag = null; });
  }

  function openCssDebugPanel(element, sessionId) {
    element = elementFromNode(element);
    if (!element) return;
    const isNewSession = !cssDebugSession;
    if (!cssDebugSession) {
      removePanel();
      activeTaskMode = 'css-debug';
      activePanelSessionId = sessionId || activePanelSessionId || 'session-' + Date.now();
    }
    activeElement = element;
    const selection = selectionPayloadFor(element, '', activePanelSessionId);
    const stableKey = cssDebugElementKey(element);
    const existingTarget = cssDebugSession ? cssDebugSession.targets.get(stableKey) : null;
    if (existingTarget) {
      cssDebugSession.activeTargetId = stableKey;
      activeElement = existingTarget.element;
      highlightElement(existingTarget.element);
      const panel = cssDebugPanel();
      if (panel) {
        const targetEl = panel.querySelector('.ui-inspect-target');
        if (targetEl) targetEl.textContent = describeSelection(existingTarget.selection);
        renderCssDebugControls(panel);
        placePanel(panel);
      }
      renderCssDebugTargetList();
      updateCssDebugOverlay();
      return;
    }
    const target = {
      id: stableKey,
      element,
      selection,
      originalInlineCssText: element.style.cssText || '',
      originalInlineStyles: cssDebugInlineStyles(element),
      originalStyles: cssDebugComputedStyles(element),
      previewStyles: {},
      activeProperties: new Set(),
      changedOnly: false,
      originalLayout: cssDebugLayoutSnapshot(element),
      interactions: [],
      primaryInteraction: null,
      drag: null,
      showBoxModel: false
    };
    if (!cssDebugSession) {
      cssDebugSession = {
        activeTargetId: stableKey,
        targets: new Map([[stableKey, target]]),
        sessionInfo: {
          id: activePanelSessionId,
          url: location.href,
          title: document.title,
          root: PROJECT_ROOT,
          timestamp: Date.now()
        }
      };
      selectedTargets = [targetFromSelection(selection, '')];
    } else {
      cssDebugSession.targets.set(stableKey, target);
      cssDebugSession.activeTargetId = stableKey;
      selectedTargets.push(targetFromSelection(selection, ''));
    }
    highlightElement(element);
    document.documentElement.setAttribute('data-ui-inspect-css-debug', 'true');
    if (isNewSession) {
      const panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.dataset.mode = 'css-debug';
      panel.innerHTML = [
        '<div class="ui-inspect-head"><div class="ui-inspect-title">Diana · CSS 调试</div><button type="button" class="ui-inspect-close" data-action="close" aria-label="关闭">×</button></div>',
        '<div class="ui-inspect-status">预览中 · 不会写入源码</div>',
        '<div class="ui-inspect-css-target-list"></div>',
        '<div class="ui-inspect-target">' + escapeHtml(describeSelection(selection)) + '</div>',
        '<div class="ui-inspect-css-toolbar"><button type="button" data-action="toggle-box-model" aria-pressed="false">盒模型</button><button type="button" data-action="toggle-changed-only" aria-pressed="false">只看已改</button></div>',
        '<div class="ui-inspect-css-groups"></div>',
        '<div class="ui-inspect-css-diff"></div>',
        '<div class="ui-inspect-css-interaction"><b>拖拽记录</b><span>暂无</span></div>',
        '<div class="ui-inspect-messages" aria-live="polite"></div>',
        '<label class="ui-inspect-field-label" for="ui-inspect-css-note">补充说明，可选</label>',
        '<textarea id="ui-inspect-css-note" placeholder="例如：保持按钮高度不变，只让视觉更柔和"></textarea>',
        '<div class="ui-inspect-actions">',
          '<div class="ui-inspect-actions-left"><button type="button" data-action="reset-css">Reset</button><button type="button" data-action="reset-all-css">Reset 全部</button></div>',
          '<div class="ui-inspect-actions-right"><button type="button" data-action="select">添加元素</button><button type="button" data-primary="true" data-action="send">发送 CSS diff</button></div>',
        '</div>'
      ].join('');
      document.body.appendChild(panel);
      placePanel(panel);
      makePanelDraggable(panel);
      ['pointerdown','mousedown','mouseup','click','dblclick','mousemove'].forEach((type) => {
        panel.addEventListener(type, (event) => event.stopPropagation());
      });
      function handleCssDebugKeydown(event) {
        const target = cssDebugActiveTarget();
        if (!target?.element) return;
        if (cssDebugPanel()?.dataset?.sent === 'true') return;
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
          syncCssDebugControl(cssDebugPanel(), prop, next + 'px');
        } else if (event.altKey && !event.shiftKey) {
          event.preventDefault();
          const prop = 'padding-' + side;
          const current = parseFloat(cssDebugComputedStyles(el)[prop]) || 0;
          const next = Math.max(0, current + delta);
          applyCssDebugValue(prop, next + 'px');
          syncCssDebugControl(cssDebugPanel(), prop, next + 'px');
        } else if (event.shiftKey && event.altKey) {
          event.preventDefault();
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            const prop = 'font-size';
            const current = parseFloat(cssDebugComputedStyles(el)[prop]) || 16;
            const next = Math.max(8, current + delta);
            applyCssDebugValue(prop, next + 'px');
            syncCssDebugControl(cssDebugPanel(), prop, next + 'px');
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            const prop = 'letter-spacing';
            const current = parseFloat(cssDebugComputedStyles(el)[prop]) || 0;
            const next = current + delta * 0.5;
            applyCssDebugValue(prop, next + 'px');
            syncCssDebugControl(cssDebugPanel(), prop, next + 'px');
          }
        } else {
          return;
        }
        const panel = cssDebugPanel();
        if (panel) {
          renderCssDebugDiff(panel);
          updateCssDebugOverlay();
        }
      }
      document.addEventListener('keydown', handleCssDebugKeydown, true);
      panel.addEventListener('ui-inspect-cleanup', () => {
        document.removeEventListener('keydown', handleCssDebugKeydown, true);
      });
      const textarea = panel.querySelector('textarea');
      panel.querySelector('[data-action="close"]').addEventListener('click', () => closeDebugPanel());
      panel.querySelector('[data-action="reset-css"]').addEventListener('click', () => {
        resetCssDebugPreview();
        renderCssDebugControls(panel);
        placePanel(panel);
        updateCssDebugOverlay();
        showToast('已恢复当前元素进入调试前的 inline style。', 'idle');
      });
      panel.querySelector('[data-action="reset-all-css"]').addEventListener('click', () => {
        resetAllCssDebugTargets();
        removeCssDebugOverlay();
        document.documentElement.removeAttribute('data-ui-inspect-css-debug');
        removePanel();
        cssDebugSession = null;
        selectionMode = 'css-debug';
        setEnabled(true);
        showToast('已恢复全部元素的 inline style，重新开始选择。', 'idle');
      });
      panel.querySelector('[data-action="toggle-box-model"]').addEventListener('click', () => {
        const target = cssDebugActiveTarget();
        if (!target) return;
        target.showBoxModel = !target.showBoxModel;
        const btn = panel.querySelector('[data-action="toggle-box-model"]');
        if (btn) btn.setAttribute('aria-pressed', target.showBoxModel ? 'true' : 'false');
        if (btn) btn.style.borderColor = target.showBoxModel ? '#60a5fa' : '';
        if (btn) btn.style.background = target.showBoxModel ? 'rgba(37, 99, 235, 0.28)' : '';
        updateCssDebugOverlay();
      });
      panel.querySelector('[data-action="toggle-changed-only"]').addEventListener('click', () => {
        const target = cssDebugActiveTarget();
        if (!target) return;
        target.changedOnly = !target.changedOnly;
        renderCssDebugControls(panel);
        placePanel(panel);
      });
      panel.querySelector('[data-action="select"]').addEventListener('click', () => {
        selectionMode = 'css-debug';
        removeCssDebugOverlay();
        setEnabled(true);
        showToast('点击页面元素添加到当前 CSS 调试会话。', 'scan');
      });
      panel.querySelector('[data-action="send"]').addEventListener('click', () => {
        const payload = makeCssDebugPayload(textarea?.value.trim() || '');
        const targetEl = panel.querySelector('.ui-inspect-target');
        if (!payload) {
          if (targetEl) targetEl.textContent = '请先选择一个元素。';
          return;
        }
        if (!payload.cssDebug.changedTargetCount) {
          if (targetEl) targetEl.textContent = '还没有样式改动，先调整一个属性再发送。';
          return;
        }
        submitPayload(payload).then(() => {
          const statusEl = panel.querySelector('.ui-inspect-status');
          if (statusEl) statusEl.textContent = statusText('sent') + ' · CSS diff 已发送（' + payload.cssDebug.changedTargetCount + ' 个元素）';
          panel.dataset.sent = 'true';
          Array.from(panel.querySelectorAll('input, select, textarea, button')).forEach((control) => {
            if (!control.matches('[data-action="close"]')) control.disabled = true;
          });
          setEnabled(false);
          removeCssDebugOverlay();
        }).catch((err) => {
          setDianaState('failed', 2200);
          if (targetEl) targetEl.textContent = friendlyError(err, 'send');
        });
      });
      textarea.focus();
    } else {
      const panel = cssDebugPanel();
      if (panel) {
        const targetEl = panel.querySelector('.ui-inspect-target');
        if (targetEl) targetEl.textContent = describeSelection(selection);
        renderCssDebugControls(panel);
        placePanel(panel);
      }
    }
    renderCssDebugTargetList();
    updateCssDebugOverlay();
    if (cssDebugPanel()) {
      renderCssDebugControls(cssDebugPanel());
      placePanel(cssDebugPanel());
    }
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

  function openDebugPanel(options) {
    removePanel();
    setEnabled(false);
    if (options?.session) {
      activeSessionData = options.session;
      activePanelSessionId = options.session.id;
      activeSessionId = options.session.id;
      selectedTargets = targetsFromSession(options.session);
      localStorage.setItem(LAST_SESSION_KEY, activeSessionId);
    } else if (options?.sessionId) {
      activePanelSessionId = options.sessionId;
    } else if (!activePanelSessionId) {
      activePanelSessionId = 'session-' + Date.now();
    }
    if (options?.element) {
      activeElement = options.element;
      const draft = selectionPayloadFor(options.element, '', activePanelSessionId);
      if (activeTaskMode === 'single' || activeTaskMode === 'troubleshoot') {
        selectedTargets = [targetFromSelection(draft, '')];
      } else {
        addSelectedTarget(draft, '');
      }
      if (activeTaskMode === 'troubleshoot') {
        selectedRuntimeEventIds = new Set();
        troubleshootRuntimeSnapshot = [];
        if (Array.isArray(runtimeEvents)) runtimeEvents.length = 0;
      }
    }
    if (activeElement) highlightElement(activeElement);
    if (!selectedTargets.length && activeSessionData?.selection) selectedTargets = targetsFromSession(activeSessionData);
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    if (activeTaskMode === 'troubleshoot') {
      troubleshootRuntimeSnapshot = runtimeEventsForPanel();
      selectedRuntimeEventIds = new Set(troubleshootRuntimeSnapshot.filter((event) => event.level === 'error').map((event) => event.id));
    }
    const hasSelection = selectedTargets.length > 0;
    const isTroubleshoot = activeTaskMode === 'troubleshoot';
    panel.innerHTML = [
      '<div class="ui-inspect-head"><div class="ui-inspect-title">Diana · ' + escapeHtml(taskModeTitle()) + '</div><button type="button" class="ui-inspect-close" data-action="close" aria-label="关闭">×</button></div>',
      '<div class="ui-inspect-status">' + escapeHtml(statusText(activeSessionData?.status || (hasSelection ? 'draft' : 'draft'))) + '</div>',
      '<div class="ui-inspect-target" data-empty="' + (hasSelection ? 'false' : 'true') + '">' + escapeHtml(describeTargets()) + '</div>',
      '<div class="ui-inspect-target-list"></div>',
      '<div class="ui-inspect-messages" aria-live="polite"></div>',
      (isTroubleshoot ? '<div class="ui-inspect-log-panel"></div><label class="ui-inspect-privacy"><input type="checkbox" data-action="privacy-confirm" /> <span>我已确认选中的日志可发送给 AI。日志可能包含 token、邮箱、订单号等敏感信息；Diana 不会自动发送 cookies、localStorage、网络请求正文或截图。</span></label>' : ''),
      '<label class="ui-inspect-field-label" for="ui-inspect-instruction">' + (isTroubleshoot ? '发生了什么？' : (activeTaskMode === 'single' ? '你想怎么改？' : '整体需求，可选')) + '</label>',
      '<textarea id="ui-inspect-instruction" placeholder="' + (isTroubleshoot ? '例如：点击提交后无响应，控制台有红色报错' : (activeTaskMode === 'single' ? '例如：把这个输入框宽一点，和下面输入框对齐' : '例如：这组输入框更紧凑，风格统一')) + '"></textarea>',
      '<div class="ui-inspect-actions">',
      '<div class="ui-inspect-actions-left"><button type="button" data-action="history">历史记录</button></div>',
      '<div class="ui-inspect-actions-right"><button type="button" data-action="copy-logs">复制日志</button><button type="button" data-action="select">' + (activeTaskMode === 'single' || isTroubleshoot ? '重选' : '继续选择') + '</button><button type="button" data-primary="true" data-action="send">发送</button></div>',
      '</div>'
    ].join('');
    document.body.appendChild(panel);
    placePanel(panel);
    ['pointerdown','mousedown','mouseup','click','dblclick','mousemove'].forEach((type) => {
      panel.addEventListener(type, (event) => {
        event.stopPropagation();
      });
    });
    const textarea = panel.querySelector('textarea');
    const send = panel.querySelector('[data-action="send"]');
    const select = panel.querySelector('[data-action="select"]');
    const history = panel.querySelector('[data-action="history"]');
    const copyLogs = panel.querySelector('[data-action="copy-logs"]');
    const close = panel.querySelector('[data-action="close"]');
    if (!isTroubleshoot && copyLogs) copyLogs.style.display = 'none';
    if (options?.prefill) textarea.value = options.prefill;
    if (activeSessionData) renderSessionData(activeSessionData);
    renderTargets(panel);
    if (isTroubleshoot) {
      renderTroubleshootLogs(panel);
      const privacy = panel.querySelector('[data-action="privacy-confirm"]');
      if (privacy) {
        privacy.checked = runtimePrivacyConfirmed;
        privacy.addEventListener('change', () => {
          runtimePrivacyConfirmed = !!privacy.checked;
          updateTroubleshootSendState(panel);
        });
      }
      updateTroubleshootSendState(panel);
    }
    placePanel(panel);
    if (activePanelSessionId && activeSessionData) startSessionStream(activePanelSessionId);
    textarea.focus();
    select.addEventListener('click', () => {
      reselectSessionId = activePanelSessionId;
      removePanel();
      selectionMode = activeTaskMode === 'single' ? 'single' : (activeTaskMode === 'troubleshoot' ? 'troubleshoot' : 'batch');
      setEnabled(true);
      if (selectionMode === 'batch') openBatchSidebar();
    });
    close.addEventListener('click', () => closeDebugPanel());
    history.addEventListener('click', () => openHistoryPanel());
    if (copyLogs) copyLogs.addEventListener('click', () => {
      syncTroubleshootSnapshot();
      const text = troubleshootRuntimeSnapshot.map((event) => '[' + event.level + '] ' + event.kind + ' ' + new Date(event.timestamp).toISOString() + '\\n' + event.message + (event.stack ? '\\n' + event.stack : '')).join('\\n\\n');
      navigator.clipboard?.writeText(text).then(() => { copyLogs.textContent = '已复制'; }).catch(() => { copyLogs.textContent = '复制失败'; });
    });
    send.addEventListener('click', () => sendCurrentTask(panel, textarea));
    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        send.click();
      }
      if (event.key === 'Escape') closeDebugPanel();
    });
	  }

  function sendCurrentTask(container, textarea) {
    const instruction = textarea?.value.trim() || '';
    const target = container.querySelector('.ui-inspect-target') || container.querySelector('.ui-inspect-sidebar-status');
    if (!selectedTargets.length) {
      if (target) target.textContent = '请先点击页面上的目标元素。';
      return;
    }
    const hasTargetNote = selectedTargets.some((item) => (item.note || '').trim());
    if (activeTaskMode !== 'troubleshoot' && !instruction && !hasTargetNote) {
      if (target) target.textContent = activeTaskMode === 'single' ? '请描述你想怎么改这个元素。' : '请填写整体需求，或给至少一个目标写要求。';
      return;
    }
    if (activeTaskMode === 'troubleshoot' && selectedRuntimeEventIds.size > 0 && !container.querySelector('[data-action="privacy-confirm"]')?.checked) {
      if (target) target.textContent = '请先确认选中的日志可发送给 AI。';
      return;
    }
    selectedTargets = selectedTargets.map((item) => {
      const note = item.note || '';
      return targetFromSelection({ ...item.selection, note }, note);
    });
    const primary = selectedTargets[0].selection;
    const diagnostics = activeTaskMode === 'troubleshoot' ? selectedDiagnostics() : undefined;
    const payload = {
      ...primary,
      id: 'selection-' + Date.now(),
      sessionId: activePanelSessionId,
      timestamp: Date.now(),
      mode: activeTaskMode,
      instruction: activeTaskMode === 'troubleshoot'
        ? ('问题排查：请根据所选组件、源码线索和用户确认的 console 日志定位原因；先说明可能原因，再实施必要修复。\\n\\n现象：' + (instruction || '用户未填写额外描述。'))
        : instruction,
      note: selectedTargets[0].note || '',
      targets: selectedTargets.map((target) => diagnostics ? { ...target, diagnostics } : target),
      diagnostics
    };
    submitPayload(payload).then(() => {
      if (textarea) textarea.value = '';
      const statusEl = container.querySelector('.ui-inspect-status') || container.querySelector('.ui-inspect-sidebar-status');
      if (statusEl) statusEl.textContent = statusText('sent') + (activeTaskMode === 'batch' ? ' · 已选择 ' + selectedTargets.length + ' 个目标' : '');
      if (activeTaskMode === 'batch') {
        selectionMode = 'done';
        renderBatchSidebar();
      } else {
        renderTargets(container);
      }
      setEnabled(false);
    }).catch((err) => {
      setDianaState('failed', 2200);
      setEnabled(false);
      if (target) target.textContent = friendlyError(err, 'send');
    });
  }

${sessionClientSource}

    function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  installStyle();
  installRuntimeCapture();
  ensureToggle();
  document.addEventListener('pointermove', moveDiana, true);
  document.addEventListener('pointerup', endDianaDrag, true);
  document.addEventListener('pointercancel', endDianaDrag, true);
  window.addEventListener('resize', refreshDianaPosition);
  window.addEventListener('resize', updateCssDebugOverlay);
  window.addEventListener('scroll', updateCssDebugOverlay, true);
})();`;
}
//# sourceMappingURL=client-source.js.map