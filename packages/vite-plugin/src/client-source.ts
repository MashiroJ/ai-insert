interface ClientSourceOptions {
  daemonUrl: string;
  root: string;
}

export function clientSource(options: ClientSourceOptions): string {
  return `(() => {
  const DAEMON_URL = ${JSON.stringify(options.daemonUrl)};
  const PROJECT_ROOT = ${JSON.stringify(options.root)};
  const STYLE_ID = 'ai-inspect-style';
  const BOX_ID = 'ai-inspect-box';
  const TOGGLE_ID = 'ai-inspect-toggle';
  const PANEL_ID = 'ai-inspect-panel';
  const LAST_SESSION_KEY = 'ai-inspect:last-session';
  let enabled = false;
  let hovered = null;
  let activeElement = null;
  let activeSessionId = localStorage.getItem(LAST_SESSION_KEY) || null;
  let activePanelSessionId = null;
  let activeSessionData = null;
  let reselectSessionId = null;
  let sessionEvents = null;

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#ai-inspect-box{position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #1d4ed8;background:rgba(29,78,216,.08);box-shadow:0 0 0 99999px rgba(15,23,42,.08);display:none}',
      '#ai-inspect-toggle{position:fixed;z-index:2147483647;right:12px;bottom:12px;border:1px solid rgba(96,165,250,.55);border-radius:999px;background:linear-gradient(135deg,#0f172a,#075985);color:white;padding:9px 13px;font:12px/1.2 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-weight:800;box-shadow:0 10px 28px rgba(14,165,233,.28);cursor:pointer}',
      '#ai-inspect-toggle[data-active="true"]{background:linear-gradient(135deg,#1d4ed8,#06b6d4);box-shadow:0 0 0 3px rgba(59,130,246,.18),0 12px 34px rgba(14,165,233,.35)}',
      '#ai-inspect-panel{position:fixed;z-index:2147483647;right:16px;bottom:54px;width:min(420px,calc(100vw - 32px));background:#0f172a;color:white;border:1px solid rgba(148,163,184,.45);border-radius:8px;box-shadow:0 18px 48px rgba(0,0,0,.35);padding:12px;font:13px/1.4 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '#ai-inspect-panel,#ai-inspect-panel *{cursor:auto!important}',
      '#ai-inspect-panel .ai-inspect-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 8px}',
      '#ai-inspect-panel .ai-inspect-title{color:#e2e8f0;font-weight:900}',
      '#ai-inspect-panel .ai-inspect-close{width:28px;height:28px;padding:0;border-radius:999px!important;line-height:1;font-size:18px}',
      '#ai-inspect-panel label{display:block;margin:0 0 8px;color:#cbd5e1;font-weight:700}',
      '#ai-inspect-panel .ai-inspect-target{margin:0 0 8px;color:#93c5fd;font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}',
      '#ai-inspect-panel .ai-inspect-target[data-empty="true"]{color:#94a3b8;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '#ai-inspect-panel .ai-inspect-session-list{display:flex;flex-direction:column;gap:6px;max-height:260px;overflow:auto;margin:0 0 10px}',
      '#ai-inspect-panel .ai-inspect-session-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:stretch}',
      '#ai-inspect-panel .ai-inspect-session-item{text-align:left;border:1px solid rgba(148,163,184,.25);border-radius:7px;background:rgba(15,23,42,.72);color:white;padding:8px 9px;cursor:pointer;min-width:0}',
      '#ai-inspect-panel .ai-inspect-session-delete{padding:0 10px;border-color:#dc2626;color:white;background:#dc2626}',
      '#ai-inspect-panel .ai-inspect-session-delete:hover{background:#b91c1c;border-color:#b91c1c}',
      '#ai-inspect-panel .ai-inspect-session-title{display:block;color:#e2e8f0;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#ai-inspect-panel .ai-inspect-session-meta{display:block;margin-top:3px;color:#94a3b8;font-size:11px}',
      '#ai-inspect-panel .ai-inspect-messages{display:flex;flex-direction:column;gap:6px;max-height:168px;overflow:auto;margin:0 0 10px;padding-right:2px}',
      '#ai-inspect-panel .ai-inspect-msg{border:1px solid rgba(148,163,184,.25);border-radius:7px;padding:8px 9px;background:rgba(15,23,42,.72);white-space:pre-wrap}',
      '#ai-inspect-panel .ai-inspect-msg[data-role="assistant"]{border-color:rgba(96,165,250,.5);background:rgba(30,64,175,.24)}',
      '#ai-inspect-panel .ai-inspect-msg-role{display:block;margin-bottom:3px;color:#93c5fd;font-size:11px;font-weight:800;text-transform:uppercase}',
      '#ai-inspect-panel textarea{box-sizing:border-box;width:100%;height:108px;resize:vertical;border:1px solid #475569;border-radius:6px;background:#020617;color:white;padding:10px;font:13px/1.45 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;outline:none}',
      '#ai-inspect-panel textarea:focus{border-color:#60a5fa;box-shadow:0 0 0 2px rgba(96,165,250,.22)}',
      '#ai-inspect-panel .ai-inspect-actions{display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:10px}',
      '#ai-inspect-panel .ai-inspect-actions-left,#ai-inspect-panel .ai-inspect-actions-right{display:flex;gap:8px;align-items:center}',
      '#ai-inspect-panel .ai-inspect-actions-right{margin-left:auto}',
      '#ai-inspect-panel button{border:1px solid #475569;border-radius:6px;background:#1e293b;color:white;padding:7px 10px;font-weight:700;cursor:pointer}',
      '#ai-inspect-panel button[data-primary="true"]{border-color:#2563eb;background:#2563eb}',
      'html[data-ai-inspect="true"] *{cursor:crosshair!important}'
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
    button.textContent = enabled ? '选择元素中' : 'AI 调试';
    button.title = enabled ? '点击页面元素完成选择' : '打开 AI 调试面板';
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
    document.documentElement.toggleAttribute('data-ai-inspect', enabled);
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
    clearHighlight();
  }

  function describeSelection(selection) {
    if (!selection) return '未选择元素，点击“选择”后在页面上框选。';
    return selection.source?.file || selection.vue?.componentName || selection.dom?.selector || '已选择 DOM 元素';
  }

  function openDebugPanel(options) {
    removePanel();
    setEnabled(false);
    if (options?.session) {
      activeSessionData = options.session;
      activePanelSessionId = options.session.id;
      activeSessionId = options.session.id;
      localStorage.setItem(LAST_SESSION_KEY, activeSessionId);
    } else if (options?.sessionId) {
      activePanelSessionId = options.sessionId;
    } else if (!activePanelSessionId) {
      activePanelSessionId = 'session-' + Date.now();
    }
    if (options?.element) activeElement = options.element;
    if (activeElement) highlightElement(activeElement);
    const selectedDraft = activeElement ? selectionPayloadFor(activeElement, '', activePanelSessionId) : null;
    const selected = selectedDraft || activeSessionData?.selection || null;
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    const hasSelection = !!selected;
    panel.innerHTML = [
      '<div class="ai-inspect-head"><div class="ai-inspect-title">AI 调试</div><button type="button" class="ai-inspect-close" data-action="close" aria-label="关闭">×</button></div>',
      '<div class="ai-inspect-target" data-empty="' + (hasSelection ? 'false' : 'true') + '">' + escapeHtml(describeSelection(selected)) + '</div>',
      '<div class="ai-inspect-messages" aria-live="polite"></div>',
      '<textarea id="ai-inspect-instruction" placeholder="描述你想调整什么，发送后 AI 会继续处理"></textarea>',
      '<div class="ai-inspect-actions">',
      '<div class="ai-inspect-actions-left"><button type="button" data-action="history">历史</button></div>',
      '<div class="ai-inspect-actions-right"><button type="button" data-action="select">选择</button><button type="button" data-primary="true" data-action="send">发送</button></div>',
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
    if (activePanelSessionId && activeSessionData) startSessionStream(activePanelSessionId);
    textarea.focus();
    ensureToggle().textContent = hasSelection ? '已选择元素' : 'AI 调试';
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
      const baseSelection = activeSessionData?.selection || null;
      if (!activeElement && !baseSelection) {
        panel.querySelector('.ai-inspect-target').textContent = '请先点击“选择”，在页面上框选一个元素。';
        panel.querySelector('.ai-inspect-target').dataset.empty = 'true';
        return;
      }
      const payload = activeElement
        ? selectionPayloadFor(activeElement, instruction, activePanelSessionId)
        : payloadFromSessionSelection(baseSelection, instruction);
      submitPayload(payload).then(() => {
        textarea.value = '';
        panel.querySelector('.ai-inspect-target').textContent = describeSelection(payload);
        panel.querySelector('.ai-inspect-target').dataset.empty = 'false';
        setEnabled(false);
      }).catch((err) => {
        ensureToggle().textContent = '发送失败';
        panel.querySelector('.ai-inspect-target').textContent = '发送失败：' + (err && err.message ? err.message : String(err));
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
      '<div class="ai-inspect-head"><div class="ai-inspect-title">历史会话</div><button type="button" class="ai-inspect-close" data-action="close" aria-label="关闭">×</button></div>',
      '<div class="ai-inspect-target">正在读取历史会话...</div>',
      '<div class="ai-inspect-session-list"></div>',
      '<div class="ai-inspect-actions">',
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
      clearHighlight();
      openDebugPanel();
    });
    function renderHistoryList(sessions) {
      const list = panel.querySelector('.ai-inspect-session-list');
      const target = panel.querySelector('.ai-inspect-target');
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
        return '<div class="ai-inspect-session-row" data-session-id="' + escapeHtml(session.id) + '">' +
          '<button type="button" class="ai-inspect-session-item" data-action="open-session">' +
            '<span class="ai-inspect-session-title">' + escapeHtml(title) + '</span>' +
            '<span class="ai-inspect-session-meta">' + escapeHtml(time + ' · ' + count + ' 条消息') + '</span>' +
          '</button>' +
          '<button type="button" class="ai-inspect-session-delete" data-action="delete-session" aria-label="删除历史会话">删除</button>' +
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
      panel.querySelector('.ai-inspect-target').textContent = '读取失败：' + (err && err.message ? err.message : String(err));
    });
  }

  function openSessionPanel(session) {
    activeElement = null;
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
    const messagesEl = panel.querySelector('.ai-inspect-messages');
    if (!messagesEl) return;
    messagesEl.innerHTML = session.messages.map((message) => (
      '<div class="ai-inspect-msg" data-role="' + escapeHtml(message.role) + '">' +
      '<span class="ai-inspect-msg-role">' + (message.role === 'assistant' ? '助手' : '你') + '</span>' +
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
