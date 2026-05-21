interface ClientSourceOptions {
  daemonUrl: string;
  root: string;
}

export function clientSource(options: ClientSourceOptions): string {
  return `(() => {
  const DAEMON_URL = ${JSON.stringify(options.daemonUrl)};
  const PROJECT_ROOT = ${JSON.stringify(options.root)};
  const STYLE_ID = 'ui-inspect-style';
  const BOX_ID = 'ui-inspect-box';
  const TOGGLE_ID = 'ui-inspect-toggle';
  const PANEL_ID = 'ui-inspect-panel';
  const LAST_SESSION_KEY = 'ui-inspect:last-session';
  let enabled = false;
  let hovered = null;
  let activeElement = null;
  let activeSessionId = localStorage.getItem(LAST_SESSION_KEY) || null;
  let activePanelSessionId = null;
  let activeSessionData = null;
  let reselectSessionId = null;
  let sessionEvents = null;
  let selectedTargets = [];

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#ui-inspect-box{position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #1d4ed8;background:rgba(29,78,216,.08);box-shadow:0 0 0 99999px rgba(15,23,42,.08);display:none}',
      '#ui-inspect-toggle{position:fixed;z-index:2147483647;right:12px;bottom:12px;border:1px solid rgba(96,165,250,.55);border-radius:999px;background:linear-gradient(135deg,#0f172a,#075985);color:white;padding:9px 13px;font:12px/1.2 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-weight:800;box-shadow:0 10px 28px rgba(14,165,233,.28);cursor:pointer}',
      '#ui-inspect-toggle[data-active="true"]{background:linear-gradient(135deg,#1d4ed8,#06b6d4);box-shadow:0 0 0 3px rgba(59,130,246,.18),0 12px 34px rgba(14,165,233,.35)}',
      '#ui-inspect-panel{position:fixed;z-index:2147483647;right:16px;bottom:54px;width:min(420px,calc(100vw - 32px));background:#0f172a;color:white;border:1px solid rgba(148,163,184,.45);border-radius:8px;box-shadow:0 18px 48px rgba(0,0,0,.35);padding:12px;font:13px/1.4 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '#ui-inspect-panel,#ui-inspect-panel *{cursor:auto!important}',
      '#ui-inspect-panel .ui-inspect-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 8px}',
      '#ui-inspect-panel .ui-inspect-title{color:#e2e8f0;font-weight:900}',
      '#ui-inspect-panel .ui-inspect-close{width:28px;height:28px;padding:0;border-radius:999px!important;line-height:1;font-size:18px}',
      '#ui-inspect-panel label{display:block;margin:0 0 8px;color:#cbd5e1;font-weight:700}',
      '#ui-inspect-panel .ui-inspect-target{margin:0 0 8px;color:#bfdbfe;font-size:12px;font-weight:800}',
      '#ui-inspect-panel .ui-inspect-target[data-empty="true"]{color:#94a3b8;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '#ui-inspect-panel .ui-inspect-status{display:inline-flex;margin:0 0 8px;padding:3px 7px;border:1px solid rgba(96,165,250,.35);border-radius:999px;color:#bfdbfe;background:rgba(30,64,175,.24);font-size:11px;font-weight:800}',
      '#ui-inspect-panel .ui-inspect-target-list{display:flex;flex-direction:column;gap:8px;max-height:220px;overflow:auto;margin:0 0 10px}',
      '#ui-inspect-panel .ui-inspect-target-card{border:1px solid rgba(148,163,184,.28);border-radius:7px;background:rgba(15,23,42,.72);padding:8px}',
      '#ui-inspect-panel .ui-inspect-target-top{display:flex;gap:8px;align-items:flex-start;justify-content:space-between;margin-bottom:7px}',
      '#ui-inspect-panel .ui-inspect-target-id{display:inline-flex;align-items:center;justify-content:center;flex:none;width:22px;height:22px;border-radius:999px;background:rgba(37,99,235,.22);border:1px solid rgba(96,165,250,.38);color:#bfdbfe;font-size:11px;font-weight:900}',
      '#ui-inspect-panel .ui-inspect-target-info{min-width:0;display:flex;gap:7px;align-items:flex-start}',
      '#ui-inspect-panel .ui-inspect-target-main{min-width:0;display:flex;flex-direction:column;gap:2px}',
      '#ui-inspect-panel .ui-inspect-target-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e2e8f0;font-size:12px;font-weight:900}',
      '#ui-inspect-panel .ui-inspect-target-meta{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#93c5fd;font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace}',
      '#ui-inspect-panel .ui-inspect-target-tools{display:flex;gap:5px;flex:none}',
      '#ui-inspect-panel .ui-inspect-target-tools button{padding:4px 7px;font-size:11px}',
      '#ui-inspect-panel .ui-inspect-target-card input{box-sizing:border-box;width:100%;border:1px solid #334155;border-radius:5px;background:#020617;color:white;padding:7px;font:12px/1.35 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;outline:none}',
      '#ui-inspect-panel .ui-inspect-session-list{display:flex;flex-direction:column;gap:6px;max-height:260px;overflow:auto;margin:0 0 10px}',
      '#ui-inspect-panel .ui-inspect-session-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:stretch}',
      '#ui-inspect-panel .ui-inspect-session-item{text-align:left;border:1px solid rgba(148,163,184,.25);border-radius:7px;background:rgba(15,23,42,.72);color:white;padding:8px 9px;cursor:pointer;min-width:0}',
      '#ui-inspect-panel .ui-inspect-session-delete{padding:0 10px;border-color:#dc2626;color:white;background:#dc2626}',
      '#ui-inspect-panel .ui-inspect-session-delete:hover{background:#b91c1c;border-color:#b91c1c}',
      '#ui-inspect-panel .ui-inspect-session-title{display:block;color:#e2e8f0;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#ui-inspect-panel .ui-inspect-session-meta{display:block;margin-top:3px;color:#94a3b8;font-size:11px}',
      '#ui-inspect-panel .ui-inspect-messages{display:flex;flex-direction:column;gap:6px;max-height:168px;overflow:auto;margin:0 0 10px;padding-right:2px}',
      '#ui-inspect-panel .ui-inspect-msg{border:1px solid rgba(148,163,184,.25);border-radius:7px;padding:8px 9px;background:rgba(15,23,42,.72);white-space:pre-wrap}',
      '#ui-inspect-panel .ui-inspect-msg[data-role="assistant"]{border-color:rgba(96,165,250,.5);background:rgba(30,64,175,.24)}',
      '#ui-inspect-panel .ui-inspect-msg-role{display:block;margin-bottom:3px;color:#93c5fd;font-size:11px;font-weight:800;text-transform:uppercase}',
      '#ui-inspect-panel textarea{box-sizing:border-box;width:100%;height:108px;resize:vertical;border:1px solid #475569;border-radius:6px;background:#020617;color:white;padding:10px;font:13px/1.45 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;outline:none}',
      '#ui-inspect-panel textarea:focus{border-color:#60a5fa;box-shadow:0 0 0 2px rgba(96,165,250,.22)}',
      '#ui-inspect-panel .ui-inspect-actions{display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:10px}',
      '#ui-inspect-panel .ui-inspect-actions-left,#ui-inspect-panel .ui-inspect-actions-right{display:flex;gap:8px;align-items:center}',
      '#ui-inspect-panel .ui-inspect-actions-right{margin-left:auto}',
      '#ui-inspect-panel button{border:1px solid #475569;border-radius:6px;background:#1e293b;color:white;padding:7px 10px;font-weight:700;cursor:pointer}',
      '#ui-inspect-panel button[data-primary="true"]{border-color:#2563eb;background:#2563eb}',
      'html[data-ui-inspect="true"] *{cursor:crosshair!important}'
    ].join('\\n');
    document.head.appendChild(style);
	  }

  function ensureToggle() {
    let button = document.getElementById(TOGGLE_ID);
    if (!button) {
      button = document.createElement('button');
      button.id = TOGGLE_ID;
      button.type = 'button';
      button.addEventListener('click', () => openDebugPanel());
      document.body.appendChild(button);
    }
    button.dataset.active = enabled ? 'true' : 'false';
    button.textContent = enabled ? '选择元素中' : 'UI 检查';
    button.title = enabled ? '点击页面元素完成选择' : '打开 UI 检查面板';
    return button;
  }

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
    if (!enabled && !activeElement) ensureBox().style.display = 'none';
    if (!enabled && activeElement) highlightElement(activeElement);
  }

  function isOwnNode(el) {
    return el && (el.id === STYLE_ID || el.id === BOX_ID || el.id === TOGGLE_ID || el.id === PANEL_ID || (el.closest && (el.closest('#' + PANEL_ID) || el.closest('#' + TOGGLE_ID))));
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

  function statusText(status) {
    return ({
      draft: '草稿',
      sent: '已发送',
      claimed: 'AI 已接收',
      working: '处理中',
      done: '已完成',
      failed: '失败'
    })[status || 'draft'] || '草稿';
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\\\$&');
  }

  function selectorFor(el) {
    if (el.id) return '#' + cssEscape(el.id);
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      let part = node.tagName.toLowerCase();
      const classList = Array.from(node.classList || []).filter(Boolean).slice(0, 3);
      if (classList.length) part += '.' + classList.map(cssEscape).join('.');
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((child) => child.tagName === node.tagName);
        if (siblings.length > 1) part += ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')';
      }
      parts.unshift(part);
      node = parent;
    }
    return parts.join(' > ');
  }

  function nearestVueComponent(el) {
    let node = el;
    while (node && node.nodeType === 1) {
      const component = node.__vueParentComponent || node.__vue_app__?._instance || null;
      if (component) return component;
      node = node.parentElement;
    }
    return null;
  }

  function componentName(type) {
    if (!type) return null;
    return type.name || type.__name || type.displayName || null;
  }

  function compactRecord(value) {
    const out = {};
    if (!value || typeof value !== 'object') return out;
    Object.keys(value).slice(0, 20).forEach((key) => {
      const item = value[key];
      if (item == null || ['string', 'number', 'boolean'].includes(typeof item)) out[key] = String(item);
      else out[key] = Object.prototype.toString.call(item);
    });
    return out;
  }

  function vueInfoFor(el) {
    const instance = nearestVueComponent(el);
    if (!instance) return null;
    const chain = [];
    let cursor = instance;
    while (cursor && chain.length < 12) {
      const name = componentName(cursor.type);
      if (name) chain.push(name);
      cursor = cursor.parent;
    }
    const sourceFile = instance.type && typeof instance.type.__file === 'string' ? instance.type.__file : null;
    return {
      componentName: componentName(instance.type),
      componentChain: chain,
      sourceFile,
      props: compactRecord(instance.props),
      attrs: compactRecord(instance.attrs)
    };
  }

  function styleSummary(el) {
    const computed = window.getComputedStyle(el);
    const keys = ['display','position','width','height','color','backgroundColor','fontSize','fontWeight','padding','margin','border','borderRadius'];
    const out = {};
    keys.forEach((key) => { out[key] = computed[key] || ''; });
    return out;
  }

  function selectionPayloadFor(el, instruction, sessionId) {
    const rect = el.getBoundingClientRect();
    const vue = vueInfoFor(el);
    const sourceFile = vue && vue.sourceFile ? vue.sourceFile : null;
    const now = Date.now();
    return {
      id: 'selection-' + now,
      sessionId: sessionId || 'session-' + now,
      url: window.location.href,
      title: document.title,
      timestamp: Date.now(),
      instruction: instruction || '',
      note: '',
      framework: vue ? 'vue3' : 'dom',
      dom: {
        selector: selectorFor(el),
        tagName: el.tagName.toLowerCase(),
        id: el.id || '',
        className: typeof el.className === 'string' ? el.className : '',
        text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 500),
        outerHtml: (el.outerHTML || '').slice(0, 4000),
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        styles: styleSummary(el)
      },
      vue,
      source: { root: PROJECT_ROOT, file: sourceFile, line: null, column: null }
    };
  }

  function payloadFromSessionSelection(selection, instruction) {
    const now = Date.now();
    return {
      ...selection,
      id: 'selection-' + now,
      sessionId: selection.sessionId,
      timestamp: now,
      instruction: instruction || ''
    };
  }

  async function submitPayload(payload) {
    const resp = await fetch(DAEMON_URL.replace(/\\/$/, '') + '/selection', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error(await resp.text());
    activeSessionId = payload.sessionId;
    localStorage.setItem(LAST_SESSION_KEY, activeSessionId);
    ensureToggle().textContent = '已发送给 AI';
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

  async function openSource(selection, button) {
    if (!selection?.source?.file) return;
    const resp = await fetch(DAEMON_URL.replace(/\\/$/, '') + '/open-source', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source: selection.source })
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

  function removePanel() {
    closeSessionStream();
    const existing = document.getElementById(PANEL_ID);
    if (existing) existing.remove();
  }

  function closeDebugPanel() {
    removePanel();
    setEnabled(false);
    activePanelSessionId = null;
    activeSessionData = null;
    reselectSessionId = null;
    selectedTargets = [];
    clearHighlight();
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
    if (selection.vue?.componentName) return selection.vue.componentName;
    if (selection.source?.file) return basename(selection.source.file);
    if (selection.dom?.tagName) {
      const id = selection.dom.id ? '#' + selection.dom.id : '';
      const text = selection.dom.text ? ' · ' + selection.dom.text.slice(0, 28) : '';
      return selection.dom.tagName + id + text;
    }
    return '已选择 DOM 元素';
  }

  function targetFromSelection(selection, note) {
    return {
      id: selection.id,
      note: note || selection.note || '',
      selection: { ...selection, note: note || selection.note || '' }
    };
  }

  function targetsFromSession(session) {
    if (Array.isArray(session?.targets) && session.targets.length) return session.targets;
    return session?.selection ? [targetFromSelection(session.selection, session.selection.note || '')] : [];
  }

  function describeTargets() {
    if (!selectedTargets.length) return '未选择元素，点击“选择”后在页面上框选。';
    return '任务草稿 · 已选择 ' + selectedTargets.length + ' 个目标';
  }

  function renderTargets(panel) {
    const list = panel.querySelector('.ui-inspect-target-list');
    const target = panel.querySelector('.ui-inspect-target');
    if (!list || !target) return;
    target.textContent = describeTargets();
    target.dataset.empty = selectedTargets.length ? 'false' : 'true';
    list.innerHTML = selectedTargets.map((item, index) => {
      const title = describeSelection(item.selection);
      const meta = sourceLabel(item.selection) || item.selection?.dom?.selector || '';
      const hasSource = !!item.selection?.source?.file;
      return '<div class="ui-inspect-target-card" data-target-index="' + index + '">' +
        '<div class="ui-inspect-target-top">' +
          '<div class="ui-inspect-target-info">' +
            '<div class="ui-inspect-target-id">' + (index + 1) + '</div>' +
            '<div class="ui-inspect-target-main">' +
              '<div class="ui-inspect-target-title" title="' + escapeHtml(title) + '">' + escapeHtml(title) + '</div>' +
              (meta ? '<div class="ui-inspect-target-meta" title="' + escapeHtml(meta) + '">' + escapeHtml(meta) + '</div>' : '') +
            '</div>' +
          '</div>' +
          '<div class="ui-inspect-target-tools">' +
            (hasSource ? '<button type="button" data-action="open-source">打开源码</button><button type="button" data-action="copy-source">复制路径</button>' : '') +
            '<button type="button" data-action="remove-target">移除</button>' +
          '</div>' +
        '</div>' +
        '<input data-target-note value="' + escapeHtml(item.note || '') + '" placeholder="针对这个目标的要求（可选），例如：标题小一点" />' +
      '</div>';
    }).join('');
    Array.from(list.querySelectorAll('[data-target-note]')).forEach((input) => {
      input.addEventListener('input', () => {
        const row = input.closest('[data-target-index]');
        const index = Number(row?.getAttribute('data-target-index'));
        if (Number.isInteger(index) && selectedTargets[index]) selectedTargets[index].note = input.value;
      });
    });
    Array.from(list.querySelectorAll('[data-action="remove-target"]')).forEach((button) => {
      button.addEventListener('click', () => {
        const row = button.closest('[data-target-index]');
        const index = Number(row?.getAttribute('data-target-index'));
        if (Number.isInteger(index)) selectedTargets.splice(index, 1);
        renderTargets(panel);
      });
    });
    Array.from(list.querySelectorAll('[data-action="open-source"]')).forEach((button) => {
      button.addEventListener('click', () => {
        const row = button.closest('[data-target-index]');
        const index = Number(row?.getAttribute('data-target-index'));
        openSource(selectedTargets[index]?.selection, button).catch(() => { button.textContent = '打开失败'; });
      });
    });
    Array.from(list.querySelectorAll('[data-action="copy-source"]')).forEach((button) => {
      button.addEventListener('click', () => {
        const row = button.closest('[data-target-index]');
        const index = Number(row?.getAttribute('data-target-index'));
        copySource(selectedTargets[index]?.selection, button).catch(() => { button.textContent = '复制失败'; });
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
      selectedTargets.push(targetFromSelection(draft, ''));
    }
    if (activeElement) highlightElement(activeElement);
    if (!selectedTargets.length && activeSessionData?.selection) selectedTargets = targetsFromSession(activeSessionData);
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    const hasSelection = selectedTargets.length > 0;
    panel.innerHTML = [
      '<div class="ui-inspect-head"><div class="ui-inspect-title">UI 检查</div><button type="button" class="ui-inspect-close" data-action="close" aria-label="关闭">×</button></div>',
      '<div class="ui-inspect-status">' + escapeHtml(statusText(activeSessionData?.status || (hasSelection ? 'draft' : 'draft'))) + '</div>',
      '<div class="ui-inspect-target" data-empty="' + (hasSelection ? 'false' : 'true') + '">' + escapeHtml(describeTargets()) + '</div>',
      '<div class="ui-inspect-target-list"></div>',
      '<div class="ui-inspect-messages" aria-live="polite"></div>',
      '<textarea id="ui-inspect-instruction" placeholder="整体需求（可选），例如：这组卡片间距太大，改得更像后台管理系统"></textarea>',
      '<div class="ui-inspect-actions">',
      '<div class="ui-inspect-actions-left"><button type="button" data-action="history">历史</button></div>',
      '<div class="ui-inspect-actions-right"><button type="button" data-action="select">选择</button><button type="button" data-primary="true" data-action="send">发送</button></div>',
      '</div>'
    ].join('');
    document.body.appendChild(panel);
    ['pointerdown','mousedown','mouseup','click','dblclick','mousemove'].forEach((type) => {
      panel.addEventListener(type, (event) => {
        event.stopPropagation();
      });
    });
    const textarea = panel.querySelector('textarea');
    const send = panel.querySelector('[data-action="send"]');
    const select = panel.querySelector('[data-action="select"]');
    const history = panel.querySelector('[data-action="history"]');
    const close = panel.querySelector('[data-action="close"]');
    if (options?.prefill) textarea.value = options.prefill;
    if (activeSessionData) renderSessionData(activeSessionData);
    renderTargets(panel);
    if (activePanelSessionId && activeSessionData) startSessionStream(activePanelSessionId);
    textarea.focus();
    ensureToggle().textContent = hasSelection ? '已选择元素' : 'UI 检查';
    select.addEventListener('click', () => {
      reselectSessionId = activePanelSessionId;
      removePanel();
      setEnabled(true);
    });
    close.addEventListener('click', () => closeDebugPanel());
    history.addEventListener('click', () => openHistoryPanel());
    send.addEventListener('click', () => {
      const instruction = textarea.value.trim();
      if (!instruction) return;
      if (!selectedTargets.length) {
        panel.querySelector('.ui-inspect-target').textContent = '请先点击“选择”，在页面上框选一个元素。';
        panel.querySelector('.ui-inspect-target').dataset.empty = 'true';
        return;
      }
      selectedTargets = selectedTargets.map((item) => {
        const note = item.note || '';
        return targetFromSelection({ ...item.selection, note }, note);
      });
      const primary = selectedTargets[0].selection;
      const payload = {
        ...primary,
        id: 'selection-' + Date.now(),
        sessionId: activePanelSessionId,
        timestamp: Date.now(),
        instruction,
        note: selectedTargets[0].note || '',
        targets: selectedTargets
      };
      submitPayload(payload).then(() => {
        textarea.value = '';
        panel.querySelector('.ui-inspect-status').textContent = statusText('sent');
        renderTargets(panel);
        setEnabled(false);
      }).catch((err) => {
        ensureToggle().textContent = '发送失败';
        panel.querySelector('.ui-inspect-target').textContent = '发送失败：' + (err && err.message ? err.message : String(err));
      });
    });
    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        send.click();
      }
      if (event.key === 'Escape') closeDebugPanel();
    });
	  }

  async function fetchSessions() {
    const url = DAEMON_URL.replace(/\\/$/, '') + '/sessions?t=' + Date.now();
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) return [];
    const payload = await resp.json();
    return Array.isArray(payload.sessions) ? payload.sessions : [];
  }

  async function deleteSession(sessionId) {
    const url = DAEMON_URL.replace(/\\/$/, '') + '/sessions/' + encodeURIComponent(sessionId);
    const resp = await fetch(url, { method: 'DELETE' });
    if (!resp.ok) throw new Error(await resp.text());
    if (activePanelSessionId === sessionId) {
      activePanelSessionId = null;
      activeSessionData = null;
      activeElement = null;
      clearHighlight();
    }
    if (activeSessionId === sessionId) {
      activeSessionId = null;
      localStorage.removeItem(LAST_SESSION_KEY);
    }
  }

  function sessionTitle(session) {
    const lastUser = [...(session.messages || [])].reverse().find((message) => message.role === 'user');
    return (lastUser && lastUser.content) || session.selection?.dom?.text || session.selection?.source?.file || session.id;
  }

  function openHistoryPanel() {
    removePanel();
    setEnabled(false);
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = [
      '<div class="ui-inspect-head"><div class="ui-inspect-title">历史会话</div><button type="button" class="ui-inspect-close" data-action="close" aria-label="关闭">×</button></div>',
      '<div class="ui-inspect-target">正在读取历史会话...</div>',
      '<div class="ui-inspect-session-list"></div>',
      '<div class="ui-inspect-actions">',
      '<button type="button" data-action="new">新调试</button>',
      '</div>'
    ].join('');
    document.body.appendChild(panel);
    ['pointerdown','mousedown','mouseup','click','dblclick','mousemove'].forEach((type) => {
      panel.addEventListener(type, (event) => event.stopPropagation());
    });
    panel.querySelector('[data-action="close"]').addEventListener('click', () => closeDebugPanel());
    panel.querySelector('[data-action="new"]').addEventListener('click', () => {
      activePanelSessionId = null;
      activeSessionData = null;
      selectedTargets = [];
      clearHighlight();
      openDebugPanel();
    });
    function renderHistoryList(sessions) {
      const list = panel.querySelector('.ui-inspect-session-list');
      const target = panel.querySelector('.ui-inspect-target');
      if (!sessions.length) {
        target.textContent = '暂无历史会话。';
        list.innerHTML = '';
        return;
      }
      target.textContent = '选择一个会话继续调试。';
      list.innerHTML = sessions.slice(0, 20).map((session) => {
        const title = sessionTitle(session).slice(0, 120);
        const time = new Date(session.updatedAt || session.createdAt || Date.now()).toLocaleString();
        const count = Array.isArray(session.messages) ? session.messages.length : 0;
        return '<div class="ui-inspect-session-row" data-session-id="' + escapeHtml(session.id) + '">' +
          '<button type="button" class="ui-inspect-session-item" data-action="open-session">' +
            '<span class="ui-inspect-session-title">' + escapeHtml(title) + '</span>' +
            '<span class="ui-inspect-session-meta">' + escapeHtml(time + ' · ' + count + ' 条消息') + '</span>' +
          '</button>' +
          '<button type="button" class="ui-inspect-session-delete" data-action="delete-session" aria-label="删除历史会话">删除</button>' +
          '</div>';
      }).join('');
      Array.from(list.querySelectorAll('[data-action="open-session"]')).forEach((button) => {
        button.addEventListener('click', () => {
          const row = button.closest('[data-session-id]');
          const session = sessions.find((item) => item.id === row?.getAttribute('data-session-id'));
          if (session) openSessionPanel(session);
        });
      });
      Array.from(list.querySelectorAll('[data-action="delete-session"]')).forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          const row = button.closest('[data-session-id]');
          const sessionId = row?.getAttribute('data-session-id');
          if (!sessionId) return;
          button.textContent = '...';
          deleteSession(sessionId).then(() => {
            const next = sessions.filter((item) => item.id !== sessionId);
            renderHistoryList(next);
          }).catch((err) => {
            target.textContent = '删除失败：' + (err && err.message ? err.message : String(err));
            button.textContent = '删除';
          });
        });
      });
    }
    fetchSessions().then((sessions) => {
      renderHistoryList(sessions);
    }).catch((err) => {
      panel.querySelector('.ui-inspect-target').textContent = '读取失败：' + (err && err.message ? err.message : String(err));
    });
  }

  function openSessionPanel(session) {
    activeElement = null;
    selectedTargets = targetsFromSession(session);
    openDebugPanel({ session, sessionId: session.id });
  }

  document.addEventListener('keydown', (event) => {
    if (event.altKey && event.shiftKey && event.code === 'KeyI') {
      event.preventDefault();
      openDebugPanel();
    }
  }, true);

  document.addEventListener('mousemove', (event) => {
    if (!enabled) return;
    updateHover(event.target);
  }, true);

  document.addEventListener('click', (event) => {
    if (!enabled) return;
    const el = hovered || event.target;
    if (!el || isOwnNode(el)) return;
    event.preventDefault();
    event.stopPropagation();
    const sessionId = reselectSessionId;
    reselectSessionId = null;
    openDebugPanel({ element: el, sessionId: sessionId || activePanelSessionId || undefined });
  }, true);

  async function fetchSession(sessionId) {
    const url = DAEMON_URL.replace(/\\/$/, '') + '/sessions/' + encodeURIComponent(sessionId) + '?t=' + Date.now();
    const resp = await fetch(url, {
      cache: 'no-store'
    });
    if (!resp.ok) return null;
    const payload = await resp.json();
    return payload.session || null;
  }

  function renderSessionData(session) {
    if (!session) return;
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    const messagesEl = panel.querySelector('.ui-inspect-messages');
    const statusEl = panel.querySelector('.ui-inspect-status');
    if (statusEl) statusEl.textContent = statusText(session.status);
    if (!messagesEl) return;
    messagesEl.innerHTML = session.messages.map((message) => (
      '<div class="ui-inspect-msg" data-role="' + escapeHtml(message.role) + '">' +
      '<span class="ui-inspect-msg-role">' + (message.role === 'assistant' ? '助手' : '你') + '</span>' +
      escapeHtml(message.content) +
      '</div>'
    )).join('');
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function renderSession(sessionId) {
    const session = await fetchSession(sessionId);
    if (session && session.id === activePanelSessionId) activeSessionData = session;
    renderSessionData(session);
  }

  function startSessionStream(sessionId) {
    closeSessionStream();
    const url = DAEMON_URL.replace(/\\/$/, '') + '/sessions/' + encodeURIComponent(sessionId) + '/events';
    sessionEvents = new EventSource(url);
    sessionEvents.addEventListener('session', (event) => {
      try {
        renderSessionData(JSON.parse(event.data));
      } catch {}
    });
    sessionEvents.onerror = () => {
      ensureToggle().textContent = '会话连接重试中';
    };
  }

  function closeSessionStream() {
    if (!sessionEvents) return;
    sessionEvents.close();
    sessionEvents = null;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  installStyle();
  ensureToggle();
})();`;
}
