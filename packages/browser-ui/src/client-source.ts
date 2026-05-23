import { runtimeMonitorClientSource } from './client-modules/runtime-monitor-source.js';
import { dianaClientSource } from './client-modules/diana-source.js';
import { selectionClientSource } from './client-modules/selection-source.js';
import { styleClientSource } from './client-modules/style-source.js';
import { taskPanelClientSource } from './client-modules/task-panel-source.js';
import { sessionClientSource } from './client-modules/session-source.js';

export interface ClientSourceOptions {
  daemonUrl: string;
  root: string;
  dianaSpriteUrl?: string;
}

export function clientSource(options: ClientSourceOptions): string {
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
  let menuHideTimer = null;
  let dianaDrag = null;
  let suppressDianaClick = false;
  let batchSidebarCollapsed = false;
  let selectedRuntimeEventIds = new Set();
  let troubleshootRuntimeSnapshot = [];
  let runtimePrivacyConfirmed = false;

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
    return el && (el.id === STYLE_ID || el.id === BOX_ID || el.id === TOGGLE_ID || el.id === MENU_ID || el.id === PANEL_ID || el.id === TOAST_ID || el.id === BATCH_SIDEBAR_ID || (el.closest && (el.closest('#' + PANEL_ID) || el.closest('#' + MENU_ID) || el.closest('#' + TOGGLE_ID) || el.closest('#' + TOAST_ID) || el.closest('#' + BATCH_SIDEBAR_ID))));
  }

  function updateHover(el) {
    if (!enabled || !el || isOwnNode(el)) return;
    hovered = el;
    highlightElement(el);
  }

  function highlightElement(el) {
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
    if (existing) existing.remove();
    const sidebar = document.getElementById(BATCH_SIDEBAR_ID);
    if (sidebar) sidebar.remove();
  }

  function closeDebugPanel() {
    removePanel();
    setEnabled(false);
    activePanelSessionId = null;
    activeSessionData = null;
    reselectSessionId = null;
    selectedTargets = [];
    selectedRuntimeEventIds = new Set();
    troubleshootRuntimeSnapshot = [];
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

  function batchIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="5" rx="1"/><rect x="4" y="15" width="16" height="5" rx="1"/><path d="M7 9v6"/><path d="M17 9v6"/></svg>';
  }

  function historyIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></svg>';
  }

  function beginSelectionMode(mode) {
    removePanel();
    selectionMode = mode;
    activeTaskMode = mode === 'single' ? 'single' : (mode === 'troubleshoot' ? 'troubleshoot' : 'batch');
    if (mode === 'single' || mode === 'batch' || mode === 'troubleshoot') {
      activePanelSessionId = 'session-' + Date.now();
      activeSessionData = null;
      selectedTargets = [];
      selectedRuntimeEventIds = new Set();
      runtimePrivacyConfirmed = false;
    }
    setEnabled(true);
    if (mode === 'source') showToast('点击页面元素，Diana 会先确认源码线索。');
    if (mode === 'troubleshoot') showToast('点击可能报错的组件，Diana 会附带可确认的 console 线索。');
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
    if (!panel || !activeElement) return;
    const rect = activeElement.getBoundingClientRect();
    panel.style.left = '';
    panel.style.right = '16px';
    panel.style.bottom = window.innerWidth <= 520 ? '72px' : '54px';
    if (window.innerWidth <= 720) return;
    if (rect.left > window.innerWidth / 2) {
      panel.style.left = '16px';
      panel.style.right = 'auto';
    }
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
})();`;
}
