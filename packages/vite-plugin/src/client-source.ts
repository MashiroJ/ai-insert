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
  const MENU_ID = 'ui-inspect-menu';
  const PANEL_ID = 'ui-inspect-panel';
  const TOAST_ID = 'ui-inspect-toast';
  const BATCH_SIDEBAR_ID = 'ui-inspect-batch-sidebar';
  const LAST_SESSION_KEY = 'ui-inspect:last-session';
  const DIANA_POSITION_KEY = 'ui-inspect:diana-position';
  const SOURCE_EDITOR_KEY = 'ui-inspect:source-editor';
  const DIANA_SPRITE_URL = '/@ui-inspect/diana.webp';
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
  const RUNTIME_EVENT_LIMIT = 20;
  const RUNTIME_EVENT_TEXT_LIMIT = 2000;
  const runtimeEvents = [];

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#ui-inspect-box{position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #1d4ed8;background:rgba(29,78,216,.08);box-shadow:0 0 0 99999px rgba(15,23,42,.08);display:none}',
      '#ui-inspect-toggle{position:fixed;z-index:2147483647;right:12px;bottom:12px;width:72px;height:78px;border:0;background:transparent;color:white;padding:0;cursor:grab;touch-action:none;user-select:none;filter:drop-shadow(0 14px 24px rgba(15,23,42,.4));transform-origin:50% 100%;outline:none}',
      '#ui-inspect-toggle[data-dragging="true"]{cursor:grabbing}',
      '#ui-inspect-toggle:focus{outline:none}',
      '#ui-inspect-toggle:focus-visible{filter:drop-shadow(0 0 0 rgba(0,0,0,0)) drop-shadow(0 0 16px rgba(96,165,250,.55))}',
      '#ui-inspect-toggle:hover{transform:translateY(-2px)}',
      '#ui-inspect-toggle[data-active="true"]{filter:drop-shadow(0 0 0 rgba(0,0,0,0)) drop-shadow(0 14px 30px rgba(37,99,235,.45))}',
      '#ui-inspect-toggle .ui-inspect-diana{position:absolute;left:0;bottom:0;width:72px;height:78px;background-image:url("' + DIANA_SPRITE_URL + '");background-repeat:no-repeat;background-size:576px 702px;background-position:0 0;image-rendering:auto;animation:ui-diana-idle 3600ms steps(6) infinite}',
      '#ui-inspect-toggle[data-dragging="true"] .ui-inspect-diana{animation:ui-diana-run 900ms steps(8) infinite}',
      '#ui-inspect-toggle[data-direction="left"] .ui-inspect-diana{transform:scaleX(-1)}',
      '#ui-inspect-toggle[data-direction="right"] .ui-inspect-diana{transform:scaleX(1)}',
      '#ui-inspect-toggle .ui-inspect-diana{transform-origin:50% 50%}',
      '#ui-inspect-toggle .ui-inspect-diana-label{display:none}',
      '#ui-inspect-toggle[data-state="selecting"] .ui-inspect-diana{animation:ui-diana-wave 1800ms steps(4) infinite}',
      '#ui-inspect-toggle[data-state="sent"] .ui-inspect-diana,#ui-inspect-toggle[data-state="claimed"] .ui-inspect-diana{animation:ui-diana-wave 2000ms steps(4) infinite}',
      '#ui-inspect-toggle[data-state="working"] .ui-inspect-diana{animation:ui-diana-run 1200ms steps(8) infinite}',
      '#ui-inspect-toggle[data-state="done"] .ui-inspect-diana{animation:ui-diana-happy 1800ms steps(5) infinite}',
      '#ui-inspect-toggle[data-state="failed"] .ui-inspect-diana{animation:ui-diana-sad 2200ms steps(8) infinite}',
      '@keyframes ui-diana-idle{from{background-position:0 0}to{background-position:-432px 0}}',
      '@keyframes ui-diana-run{from{background-position:0 -78px}to{background-position:-576px -78px}}',
      '@keyframes ui-diana-wave{from{background-position:0 -234px}to{background-position:-288px -234px}}',
      '@keyframes ui-diana-happy{from{background-position:0 -312px}to{background-position:-360px -312px}}',
      '@keyframes ui-diana-sad{from{background-position:0 -390px}to{background-position:-576px -390px}}',
      '#ui-inspect-menu{position:fixed;z-index:2147483647;right:22px;bottom:102px;width:48px;background:rgba(15,23,42,.78);color:white;border:1px solid rgba(148,163,184,.18);border-radius:999px;box-shadow:0 14px 34px rgba(15,23,42,.38);padding:7px 0;font:12px/1 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;backdrop-filter:blur(10px)}',
      '#ui-inspect-menu{cursor:auto}',
      '#ui-inspect-menu .ui-inspect-menu-head{display:none}',
      '#ui-inspect-menu .ui-inspect-menu-actions{display:flex;flex-direction:column;align-items:center;gap:5px}',
      '#ui-inspect-menu button{position:relative;box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border:0;border-radius:999px;background:transparent;color:#f8fafc;padding:0;cursor:pointer;outline:none}',
      '#ui-inspect-menu button svg{width:21px;height:21px;display:block;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round}',
      '#ui-inspect-menu button:focus{outline:none}',
      '#ui-inspect-menu button:focus-visible,#ui-inspect-menu button:hover{background:rgba(96,165,250,.18);color:white}',
      '#ui-inspect-menu .ui-inspect-menu-divider{width:24px;height:1px;background:rgba(226,232,240,.28);margin:2px 0}',
      '#ui-inspect-menu .ui-inspect-menu-desc{position:absolute;right:46px;top:50%;transform:translateY(-50%);display:none;white-space:nowrap;border-radius:8px;background:rgba(71,85,105,.92);color:#f8fafc;padding:9px 11px;font-size:14px;line-height:1;font-weight:800;box-shadow:0 10px 26px rgba(15,23,42,.28);pointer-events:none}',
      '#ui-inspect-menu button:hover .ui-inspect-menu-desc,#ui-inspect-menu button:focus-visible .ui-inspect-menu-desc{display:block}',
      '#ui-inspect-menu[data-side="right"] .ui-inspect-menu-desc{left:46px;right:auto}',
      '#ui-inspect-menu .ui-inspect-menu-secondary{color:#cbd5e1}',
      '#ui-inspect-toast{position:fixed;z-index:2147483647;right:22px;bottom:112px;max-width:min(300px,calc(100vw - 44px));border:1px solid rgba(96,165,250,.42);border-radius:8px;background:rgba(15,23,42,.94);color:#dbeafe;padding:8px 10px;font:12px/1.45 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-weight:800;box-shadow:0 14px 36px rgba(15,23,42,.36)}',
      '#ui-inspect-batch-sidebar{position:fixed;z-index:2147483647;right:16px;top:16px;bottom:108px;width:min(400px,calc(100vw - 32px));display:flex;flex-direction:column;background:#0b1220;color:white;border:1px solid rgba(148,163,184,.34);border-radius:8px;box-shadow:0 20px 54px rgba(0,0,0,.38);padding:0;font:13px/1.4 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}',
      '#ui-inspect-batch-sidebar[data-collapsed="true"]{top:auto;left:16px;right:auto;bottom:18px;width:auto;min-width:156px;height:auto;padding:0;border-radius:999px}',
      '#ui-inspect-batch-sidebar[data-collapsed="true"] .ui-inspect-sidebar-list,#ui-inspect-batch-sidebar[data-collapsed="true"] .ui-inspect-messages,#ui-inspect-batch-sidebar[data-collapsed="true"] .ui-inspect-sidebar-footer,#ui-inspect-batch-sidebar[data-collapsed="true"] .ui-inspect-sidebar-close{display:none}',
      '#ui-inspect-batch-sidebar[data-collapsed="true"] .ui-inspect-sidebar-head{display:none}',
      '#ui-inspect-batch-sidebar[data-collapsed="true"] .ui-inspect-sidebar-status{margin:0;padding:9px 12px;border-radius:999px;cursor:pointer}',
      '#ui-inspect-batch-sidebar,#ui-inspect-batch-sidebar *{cursor:auto!important}',
      '#ui-inspect-batch-sidebar .ui-inspect-sidebar-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:13px 12px 11px;border-bottom:1px solid rgba(148,163,184,.16);background:#111827}',
      '#ui-inspect-batch-sidebar .ui-inspect-sidebar-title{color:#f8fafc;font-size:14px;font-weight:900}',
      '#ui-inspect-batch-sidebar .ui-inspect-sidebar-subtitle{margin-top:2px;color:#94a3b8;font:11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:800}',
      '#ui-inspect-batch-sidebar .ui-inspect-sidebar-close{width:28px;height:28px;padding:0;border-radius:7px!important;line-height:1;font-size:18px;background:#1f2937;border-color:#334155;color:#e2e8f0}',
      '#ui-inspect-batch-sidebar .ui-inspect-sidebar-status{display:inline-flex;align-self:flex-start;margin:10px 12px 8px;padding:4px 8px;border:1px solid rgba(34,197,94,.34);border-radius:999px;background:rgba(34,197,94,.1);color:#bbf7d0;font-size:11px;font-weight:900}',
      '#ui-inspect-batch-sidebar .ui-inspect-sidebar-list{display:flex;flex-direction:column;gap:8px;min-height:120px;overflow:auto;flex:1;margin:0;padding:0 12px 10px;scrollbar-width:thin}',
      '#ui-inspect-batch-sidebar .ui-inspect-sidebar-empty{border:1px dashed rgba(148,163,184,.28);border-radius:8px;color:#94a3b8;background:#0f172a;padding:18px 14px;font-weight:800;text-align:center}',
      '#ui-inspect-batch-sidebar .ui-inspect-sidebar-footer{border-top:1px solid rgba(148,163,184,.16);background:#111827;padding:10px 12px 12px}',
      '#ui-inspect-batch-sidebar .ui-inspect-sidebar-footer label{display:block;margin:0 0 6px;color:#cbd5e1;font-size:12px;font-weight:900}',
      '#ui-inspect-batch-sidebar textarea{box-sizing:border-box;width:100%;height:78px;resize:vertical;border:1px solid #334155;border-radius:7px;background:#020817;color:white;padding:9px;font:13px/1.45 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;outline:none}',
      '#ui-inspect-batch-sidebar textarea:focus,#ui-inspect-batch-sidebar input:focus{border-color:#60a5fa;box-shadow:0 0 0 2px rgba(96,165,250,.22)}',
      '#ui-inspect-batch-sidebar button{border:1px solid #334155;border-radius:7px;background:#1f2937;color:#e2e8f0;padding:7px 10px;font-weight:800;cursor:pointer}',
      '#ui-inspect-batch-sidebar button:hover{border-color:#64748b;background:#273449}',
      '#ui-inspect-batch-sidebar button:disabled{opacity:.55;cursor:default}',
      '#ui-inspect-batch-sidebar button[data-primary="true"]{border-color:#2563eb;background:#2563eb;color:white}',
      '#ui-inspect-batch-sidebar button[data-primary="true"]:hover{border-color:#1d4ed8;background:#1d4ed8}',
      '#ui-inspect-batch-sidebar .ui-inspect-sidebar-collapse{position:absolute;right:46px;top:13px;width:28px;height:28px;padding:0;border-radius:7px!important;line-height:1;font-size:16px;background:#1f2937;border-color:#334155;color:#e2e8f0}',
      '#ui-inspect-batch-sidebar .ui-inspect-actions{display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:10px}',
      '#ui-inspect-batch-sidebar .ui-inspect-actions-right{display:flex;gap:8px;margin-left:auto}',
      '#ui-inspect-batch-sidebar .ui-inspect-target-card{border:1px solid rgba(148,163,184,.22);border-radius:8px;background:#111827;padding:9px;box-shadow:0 1px 0 rgba(255,255,255,.03) inset}',
      '#ui-inspect-batch-sidebar .ui-inspect-target-top{display:flex;gap:8px;align-items:flex-start;justify-content:space-between;margin-bottom:8px}',
      '#ui-inspect-batch-sidebar .ui-inspect-target-info{min-width:0;display:flex;gap:8px;align-items:flex-start}',
      '#ui-inspect-batch-sidebar .ui-inspect-target-id{display:inline-flex;align-items:center;justify-content:center;flex:none;width:22px;height:22px;border-radius:6px;background:#166534;color:#dcfce7;font-size:11px;font-weight:900}',
      '#ui-inspect-batch-sidebar .ui-inspect-target-main{min-width:0;display:flex;flex-direction:column;gap:2px}',
      '#ui-inspect-batch-sidebar .ui-inspect-target-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f8fafc;font-size:12px;font-weight:900}',
      '#ui-inspect-batch-sidebar .ui-inspect-target-meta{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#93c5fd;font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace}',
      '#ui-inspect-batch-sidebar .ui-inspect-target-tools{display:flex;gap:5px;flex:none}',
      '#ui-inspect-batch-sidebar .ui-inspect-target-tools button{padding:4px 7px;font-size:11px}',
      '#ui-inspect-batch-sidebar .ui-inspect-target-card input{box-sizing:border-box;width:100%;border:1px solid #334155;border-radius:6px;background:#020817;color:white;padding:7px;font:12px/1.35 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;outline:none}',
      '#ui-inspect-batch-sidebar .ui-inspect-messages{display:flex;flex-direction:column;gap:6px;max-height:132px;overflow:auto;margin:0 12px 10px;padding-right:2px}',
      '#ui-inspect-batch-sidebar .ui-inspect-msg{border:1px solid rgba(148,163,184,.25);border-radius:7px;padding:8px 9px;background:#151b26;white-space:pre-wrap}',
      '#ui-inspect-batch-sidebar .ui-inspect-msg[data-role="assistant"]{border-color:rgba(34,197,94,.34);background:rgba(34,197,94,.1)}',
      '#ui-inspect-batch-sidebar .ui-inspect-msg-role{display:block;margin-bottom:3px;color:#86efac;font-size:11px;font-weight:800;text-transform:uppercase}',
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
      '#ui-inspect-panel .ui-inspect-field-label{display:block;margin:6px 0 6px;color:#cbd5e1;font-size:12px;font-weight:900}',
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
      '#ui-inspect-panel .ui-inspect-source-path{border:1px solid rgba(96,165,250,.28);border-radius:7px;background:rgba(15,23,42,.72);color:#bfdbfe;padding:8px 9px;margin:8px 0 10px;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}',
      '#ui-inspect-panel .ui-inspect-editor-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:8px 0 10px}',
      '#ui-inspect-panel .ui-inspect-editor-option{display:flex;align-items:center;gap:7px;border:1px solid rgba(148,163,184,.26);border-radius:7px;background:rgba(15,23,42,.72);padding:8px;color:#e2e8f0;font-weight:800;cursor:pointer}',
      '#ui-inspect-panel .ui-inspect-editor-option input{margin:0}',
      '#ui-inspect-panel .ui-inspect-editor-option[data-disabled="true"]{opacity:.48}',
      '#ui-inspect-panel .ui-inspect-log-panel{display:flex;flex-direction:column;gap:7px;margin:8px 0 10px}',
      '#ui-inspect-panel .ui-inspect-log-summary{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#cbd5e1;font-size:12px;font-weight:900}',
      '#ui-inspect-panel .ui-inspect-log-list{display:flex;flex-direction:column;gap:6px;max-height:150px;overflow:auto}',
      '#ui-inspect-panel .ui-inspect-log-item{display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;border:1px solid rgba(148,163,184,.24);border-radius:7px;background:rgba(15,23,42,.72);padding:7px}',
      '#ui-inspect-panel .ui-inspect-log-item[data-level="error"]{border-color:rgba(248,113,113,.42);background:rgba(127,29,29,.18)}',
      '#ui-inspect-panel .ui-inspect-log-item input{margin-top:2px}',
      '#ui-inspect-panel .ui-inspect-log-meta{display:flex;gap:6px;align-items:center;margin-bottom:3px;color:#93c5fd;font:11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace}',
      '#ui-inspect-panel .ui-inspect-log-message{color:#e2e8f0;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word}',
      '#ui-inspect-panel .ui-inspect-log-empty{border:1px dashed rgba(148,163,184,.3);border-radius:7px;background:rgba(15,23,42,.54);color:#94a3b8;padding:10px;font-size:12px;font-weight:800}',
      '#ui-inspect-panel .ui-inspect-privacy{display:flex;gap:7px;align-items:flex-start;border:1px solid rgba(250,204,21,.26);border-radius:7px;background:rgba(113,63,18,.18);color:#fde68a;padding:8px;margin:8px 0 0;font-size:12px;line-height:1.45;font-weight:800}',
      '#ui-inspect-panel .ui-inspect-privacy input{margin-top:2px;flex:none}',
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
      button.innerHTML = '<span class="ui-inspect-diana" aria-hidden="true"></span><span class="ui-inspect-diana-label" aria-hidden="true">Diana</span>';
      button.addEventListener('pointerdown', (event) => beginDianaDrag(event, button));
      button.addEventListener('click', (event) => {
        if (suppressDianaClick) {
          suppressDianaClick = false;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        openModeMenu();
      });
      button.addEventListener('mouseenter', () => openModeMenu());
      button.addEventListener('mouseleave', () => scheduleModeMenuClose());
      button.addEventListener('focus', () => openModeMenu());
      button.addEventListener('blur', () => scheduleModeMenuClose());
      document.body.appendChild(button);
      applyDianaPosition(button);
    }
    button.dataset.active = enabled ? 'true' : 'false';
    if (!button.dataset.state) button.dataset.state = 'idle';
    button.setAttribute('aria-label', enabled ? 'Diana 正在等你选择元素' : 'Diana');
    button.removeAttribute('title');
    return button;
  }

  function readDianaPosition() {
    try {
      const value = JSON.parse(localStorage.getItem(DIANA_POSITION_KEY) || 'null');
      if (!value || typeof value.x !== 'number' || typeof value.y !== 'number') return null;
      return clampDianaPosition(value.x, value.y);
    } catch {
      return null;
    }
  }

  function saveDianaPosition(x, y) {
    const next = clampDianaPosition(x, y);
    localStorage.setItem(DIANA_POSITION_KEY, JSON.stringify(next));
    return next;
  }

  function clampDianaPosition(x, y) {
    const margin = 8;
    const width = 72;
    const height = 78;
    const maxX = Math.max(margin, window.innerWidth - width - margin);
    const maxY = Math.max(margin, window.innerHeight - height - margin);
    return {
      x: Math.min(Math.max(margin, x), maxX),
      y: Math.min(Math.max(margin, y), maxY)
    };
  }

  function applyDianaPosition(button, position) {
    const next = position || readDianaPosition();
    if (!next) return;
    button.style.left = next.x + 'px';
    button.style.top = next.y + 'px';
    button.style.right = 'auto';
    button.style.bottom = 'auto';
  }

  function beginDianaDrag(event, button) {
    if (event.button != null && event.button !== 0) return;
    const rect = button.getBoundingClientRect();
    dianaDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false
    };
    button.dataset.dragging = 'true';
    cancelModeMenuClose();
    const menu = document.getElementById(MENU_ID);
    if (menu) menu.remove();
    try { button.setPointerCapture(event.pointerId); } catch {}
    event.preventDefault();
  }

  function moveDiana(event) {
    if (!dianaDrag || event.pointerId !== dianaDrag.pointerId) return;
    const distance = Math.hypot(event.clientX - dianaDrag.startX, event.clientY - dianaDrag.startY);
    if (distance > 4) dianaDrag.moved = true;
    const button = document.getElementById(TOGGLE_ID);
    if (!button) return;
    const deltaX = event.clientX - dianaDrag.lastX;
    if (Math.abs(deltaX) > 1) button.dataset.direction = deltaX < 0 ? 'left' : 'right';
    dianaDrag.lastX = event.clientX;
    const next = clampDianaPosition(event.clientX - dianaDrag.offsetX, event.clientY - dianaDrag.offsetY);
    applyDianaPosition(button, next);
    event.preventDefault();
  }

  function endDianaDrag(event) {
    if (!dianaDrag || event.pointerId !== dianaDrag.pointerId) return;
    const button = document.getElementById(TOGGLE_ID);
    if (button) {
      delete button.dataset.dragging;
      const rect = button.getBoundingClientRect();
      saveDianaPosition(rect.left, rect.top);
      try { button.releasePointerCapture(event.pointerId); } catch {}
    }
    suppressDianaClick = !!dianaDrag.moved;
    dianaDrag = null;
    event.preventDefault();
  }

  function refreshDianaPosition() {
    const button = document.getElementById(TOGGLE_ID);
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const next = saveDianaPosition(rect.left, rect.top);
    applyDianaPosition(button, next);
    const menu = document.getElementById(MENU_ID);
    if (menu) positionModeMenu(menu);
  }

  function cancelModeMenuClose() {
    if (menuHideTimer) clearTimeout(menuHideTimer);
    menuHideTimer = null;
  }

  function scheduleModeMenuClose() {
    cancelModeMenuClose();
    menuHideTimer = setTimeout(() => {
      menuHideTimer = null;
      const menu = document.getElementById(MENU_ID);
      if (menu) menu.remove();
    }, 320);
  }

  function setDianaState(state, temporary) {
    const normalized = state === 'draft' ? 'idle' : (state || 'idle');
    const button = ensureToggle();
    button.dataset.state = normalized;
    const label = button.querySelector('.ui-inspect-diana-label');
    if (label) label.textContent = 'Diana';
    button.setAttribute('aria-label', normalized === 'idle' ? 'Diana' : 'Diana · ' + dianaStateText(normalized));
    button.removeAttribute('title');
    if (dianaResetTimer) clearTimeout(dianaResetTimer);
    if (temporary) {
      dianaResetTimer = setTimeout(() => {
        dianaResetTimer = null;
        setDianaState(enabled ? 'selecting' : 'idle');
      }, temporary);
    }
  }

  function dianaStateText(state) {
    return ({
      idle: 'Diana',
      selecting: '选择中',
      sent: '已发送',
      claimed: '已接收',
      working: '处理中',
      done: '完成',
      failed: '失败'
    })[state || 'idle'] || 'Diana';
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
    setDianaState(enabled ? 'selecting' : 'idle');
    if (!enabled && !activeElement) ensureBox().style.display = 'none';
    if (!enabled && activeElement) highlightElement(activeElement);
  }

  function installRuntimeCapture() {
    if (window.__UI_INSPECT_RUNTIME_CAPTURED__) return;
    window.__UI_INSPECT_RUNTIME_CAPTURED__ = true;
    const originalError = console.error;
    const originalWarn = console.warn;
    console.error = function(...args) {
      recordRuntimeEvent('console', 'error', args);
      return originalError.apply(this, args);
    };
    console.warn = function(...args) {
      recordRuntimeEvent('console', 'warn', args);
      return originalWarn.apply(this, args);
    };
    window.addEventListener('error', (event) => {
      recordRuntimeEvent('window-error', 'error', [event.message, event.error?.stack || '']);
    });
    window.addEventListener('unhandledrejection', (event) => {
      recordRuntimeEvent('unhandledrejection', 'error', [event.reason]);
    });
  }

  function recordRuntimeEvent(kind, level, args) {
    const text = args.map(formatRuntimeValue).filter(Boolean).join(' ');
    const stack = args.map((item) => item && item.stack ? String(item.stack) : '').find(Boolean) || '';
    runtimeEvents.push({
      id: 'runtime-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      kind,
      level,
      message: truncateText(redactRuntimeText(text || kind), RUNTIME_EVENT_TEXT_LIMIT),
      stack: truncateText(redactRuntimeText(stack), RUNTIME_EVENT_TEXT_LIMIT),
      timestamp: Date.now(),
      url: window.location.href
    });
    while (runtimeEvents.length > RUNTIME_EVENT_LIMIT) runtimeEvents.shift();
    const panel = document.getElementById(PANEL_ID);
    if (panel && activeTaskMode === 'troubleshoot') {
      syncTroubleshootSnapshot();
      renderTroubleshootLogs(panel);
      updateTroubleshootSendState(panel);
    }
  }

  function formatRuntimeValue(value) {
    if (value == null) return String(value);
    if (value instanceof Error) return value.message || String(value);
    if (typeof value === 'string') return value;
    if (['number','boolean','bigint'].includes(typeof value)) return String(value);
    try {
      return JSON.stringify(value, (_key, item) => typeof item === 'function' ? '[Function]' : item);
    } catch {
      return Object.prototype.toString.call(value);
    }
  }

  function redactRuntimeText(value) {
    return String(value || '')
      .replace(/(token|authorization|password|secret|cookie)(["'\\s:=]+)([^\\s"',;&]+)/ig, '$1$2[redacted]')
      .replace(/Bearer\\s+[A-Za-z0-9._~+/-]+=*/g, 'Bearer [redacted]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/ig, '[email]');
  }

  function truncateText(value, max) {
    const text = String(value || '');
    return text.length > max ? text.slice(0, max) + '... [truncated]' : text;
  }

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

  function elementSummaryFor(el) {
    if (!el || el.nodeType !== 1) return null;
    const text = cleanText(el.textContent || '').slice(0, 120);
    return {
      tagName: el.tagName.toLowerCase(),
      selector: selectorFor(el),
      role: el.getAttribute('role') || '',
      text,
      attributes: attributesFor(el)
    };
  }

  function attributesFor(el) {
    const out = {};
    Array.from(el.attributes || []).slice(0, 20).forEach((attr) => {
      out[attr.name] = truncateText(attr.value, 160);
    });
    return out;
  }

  function parentChainFor(el) {
    const chain = [];
    let cursor = el.parentElement;
    while (cursor && cursor !== document.body && chain.length < 5) {
      chain.push(elementSummaryFor(cursor));
      cursor = cursor.parentElement;
    }
    return chain.filter(Boolean);
  }

  function siblingsFor(el) {
    const parent = el.parentElement;
    if (!parent) return [];
    return Array.from(parent.children).filter((item) => item !== el).slice(0, 8).map(elementSummaryFor).filter(Boolean);
  }

  function childrenFor(el) {
    return Array.from(el.children || []).slice(0, 8).map(elementSummaryFor).filter(Boolean);
  }

  function accessibleNameFor(el) {
    const html = el.outerHTML || '';
    const attrs = attrsFromHtml(html);
    const labelledBy = attrs['aria-labelledby'];
    if (labelledBy) {
      const label = document.getElementById(labelledBy);
      if (label) return cleanText(label.textContent);
    }
    const explicit = attrs['aria-label'] || attrs.title || attrs.placeholder || '';
    if (explicit) return cleanText(explicit);
    if (el.id) {
      const label = document.querySelector('label[for="' + cssEscape(el.id) + '"]');
      if (label) return cleanText(label.textContent);
    }
    return cleanText(el.textContent || '').slice(0, 80);
  }

  function formContextFor(el) {
    const html = el.outerHTML || '';
    const attrs = attrsFromHtml(html);
    let label = '';
    if (el.id) {
      const labelEl = document.querySelector('label[for="' + cssEscape(el.id) + '"]');
      label = labelEl ? cleanText(labelEl.textContent) : '';
    }
    return {
      label,
      placeholder: cleanText(attrs.placeholder || ''),
      name: cleanText(attrs.name || ''),
      type: cleanText(attrs.type || '')
    };
  }

  function interactionStateFor(el) {
    const state = {};
    try {
      if (el.matches(':hover')) state.hover = true;
      if (el.matches(':active')) state.active = true;
      if (el.matches(':focus')) state.focus = true;
      if (el.matches(':focus-within')) state.focusWithin = true;
    } catch {}
    return state;
  }

  function pseudoSummary(el, pseudo) {
    const computed = window.getComputedStyle(el, pseudo);
    const content = computed.content || '';
    if (!content || content === 'none') return undefined;
    return {
      content: truncateText(content, 160),
      color: computed.color || '',
      backgroundColor: computed.backgroundColor || '',
      display: computed.display || ''
    };
  }

  function elementContextFor(el) {
    return {
      accessibleName: accessibleNameFor(el),
      role: el.getAttribute('role') || '',
      attributes: attributesFor(el),
      parentChain: parentChainFor(el),
      siblingsSummary: siblingsFor(el),
      childrenSummary: childrenFor(el),
      formContext: formContextFor(el),
      interactionState: interactionStateFor(el),
      computedStyles: styleSummary(el),
      pseudoElements: {
        before: pseudoSummary(el, '::before'),
        after: pseudoSummary(el, '::after')
      }
    };
  }

  function sourceHintsFor(vue, sourceFile, el) {
    const hints = [];
    if (sourceFile) {
      hints.push({ kind: 'direct', file: sourceFile, line: null, column: null, confidence: 0.86, reason: 'Vue runtime exposed component source file.' });
      if (vue?.componentName) hints.push({ kind: 'vue-component', file: sourceFile, line: null, column: null, confidence: 0.78, reason: 'Selected element belongs to Vue component ' + vue.componentName + '.' });
    }
    const className = typeof el.className === 'string' ? el.className : '';
    if (sourceFile && className) hints.push({ kind: 'style', file: sourceFile, line: null, column: null, confidence: 0.42, reason: 'Element class list may map to style/template in the same component.' });
    return hints;
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
      mode: activeTaskMode,
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
      source: { root: PROJECT_ROOT, file: sourceFile, line: null, column: null },
      context: elementContextFor(el),
      sourceHints: sourceHintsFor(vue, sourceFile, el)
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

  function runtimeEventsForPanel() {
    return runtimeEvents.slice(-RUNTIME_EVENT_LIMIT).reverse();
  }

  function syncTroubleshootSnapshot() {
    const known = new Set(troubleshootRuntimeSnapshot.map((event) => event.id));
    const additions = runtimeEventsForPanel().filter((event) => !known.has(event.id));
    if (additions.length) troubleshootRuntimeSnapshot = additions.concat(troubleshootRuntimeSnapshot);
    if (troubleshootRuntimeSnapshot.length > RUNTIME_EVENT_LIMIT) {
      const selected = troubleshootRuntimeSnapshot.filter((event) => selectedRuntimeEventIds.has(event.id));
      const unselected = troubleshootRuntimeSnapshot.filter((event) => !selectedRuntimeEventIds.has(event.id));
      troubleshootRuntimeSnapshot = selected.concat(unselected).slice(0, Math.max(RUNTIME_EVENT_LIMIT, selected.length));
    }
  }

  function selectedDiagnostics() {
    syncTroubleshootSnapshot();
    const selected = troubleshootRuntimeSnapshot.filter((event) => selectedRuntimeEventIds.has(event.id));
    return {
      runtimeEvents: selected,
      capturedAt: Date.now(),
      truncated: runtimeEvents.length >= RUNTIME_EVENT_LIMIT
    };
  }

  function renderTroubleshootLogs(panel) {
    const box = panel.querySelector('.ui-inspect-log-panel');
    if (!box) return;
    syncTroubleshootSnapshot();
    const events = troubleshootRuntimeSnapshot;
    const selectedCount = events.filter((event) => selectedRuntimeEventIds.has(event.id)).length;
    if (!events.length) {
      box.innerHTML = '<div class="ui-inspect-log-summary"><span>Console 线索</span><span>0 条</span></div><div class="ui-inspect-log-empty">暂未捕获到 console 错误。你可以保留面板，复现一次问题后再发送。</div>';
      return;
    }
    box.innerHTML = [
      '<div class="ui-inspect-log-summary"><span>Console 线索</span><span>已选 ' + selectedCount + ' / ' + events.length + ' 条</span></div>',
      '<div class="ui-inspect-log-list">',
      events.map((event) => {
        const checked = selectedRuntimeEventIds.has(event.id) ? ' checked' : '';
        const time = new Date(event.timestamp).toLocaleTimeString();
        return '<label class="ui-inspect-log-item" data-level="' + escapeHtml(event.level) + '">' +
          '<input type="checkbox" data-runtime-id="' + escapeHtml(event.id) + '"' + checked + ' />' +
          '<span><span class="ui-inspect-log-meta"><span>' + escapeHtml(event.level) + '</span><span>' + escapeHtml(event.kind) + '</span><span>' + escapeHtml(time) + '</span></span>' +
          '<span class="ui-inspect-log-message">' + escapeHtml(event.message || event.stack || '') + '</span></span>' +
        '</label>';
      }).join(''),
      '</div>'
    ].join('');
    Array.from(box.querySelectorAll('[data-runtime-id]')).forEach((input) => {
      input.addEventListener('change', () => {
        const id = input.getAttribute('data-runtime-id');
        if (!id) return;
        if (input.checked) selectedRuntimeEventIds.add(id);
        else selectedRuntimeEventIds.delete(id);
        renderTroubleshootLogs(panel);
        updateTroubleshootSendState(panel);
      });
    });
  }

  function updateTroubleshootSendState(panel) {
    if (activeTaskMode !== 'troubleshoot') return;
    const send = panel.querySelector('[data-action="send"]');
    if (!send) return;
    const hasSelectedLogs = selectedRuntimeEventIds.size > 0;
    const confirmed = !!panel.querySelector('[data-action="privacy-confirm"]')?.checked;
    send.textContent = hasSelectedLogs ? '发送组件和日志' : '发送组件线索';
    send.disabled = hasSelectedLogs && !confirmed;
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
    if (activeTaskMode === 'single') return '目标';
    return '已选择 ' + selectedTargets.length + ' 个目标';
  }

  function taskModeTitle() {
    if (activeTaskMode === 'troubleshoot') return '问题排查';
    return activeTaskMode === 'single' ? '局部调整' : '批量调整';
  }

  function targetNotePlaceholder() {
    return activeTaskMode === 'single'
      ? ''
      : '针对这个目标的要求（可选），例如：标题小一点';
  }

  function openBatchSidebar() {
    renderBatchSidebar();
  }

  function renderBatchSidebar() {
    if (activeTaskMode !== 'batch') return;
    let sidebar = document.getElementById(BATCH_SIDEBAR_ID);
    const existingInstruction = sidebar?.querySelector('#ui-inspect-batch-instruction')?.value || '';
    if (!sidebar) {
      sidebar = document.createElement('div');
      sidebar.id = BATCH_SIDEBAR_ID;
      document.body.appendChild(sidebar);
      ['pointerdown','mousedown','mouseup','click','dblclick','mousemove'].forEach((type) => {
        sidebar.addEventListener(type, (event) => event.stopPropagation());
      });
    }
    const status = activeSessionData?.status ? statusText(activeSessionData.status) : (selectionMode === 'batch' ? '选择中' : '草稿');
    sidebar.innerHTML = [
      '<div class="ui-inspect-sidebar-head">',
        '<div><div class="ui-inspect-sidebar-title">批量调整</div><div class="ui-inspect-sidebar-subtitle">Diana 工作台</div></div>',
        '<button type="button" class="ui-inspect-sidebar-collapse" data-action="collapse" aria-label="收起">−</button>',
        '<button type="button" class="ui-inspect-sidebar-close" data-action="close" aria-label="关闭">×</button>',
      '</div>',
      '<div class="ui-inspect-sidebar-status">' + escapeHtml(status + ' · ' + selectedTargets.length + ' 个目标') + '</div>',
      '<div class="ui-inspect-sidebar-list"></div>',
      '<div class="ui-inspect-messages" aria-live="polite"></div>',
      '<div class="ui-inspect-sidebar-footer">',
        '<label for="ui-inspect-batch-instruction">整体需求，可选</label>',
        '<textarea id="ui-inspect-batch-instruction" placeholder="例如：这组输入框更紧凑，风格统一">' + escapeHtml(existingInstruction) + '</textarea>',
        '<div class="ui-inspect-actions">',
          '<button type="button" data-action="history">历史记录</button>',
          '<div class="ui-inspect-actions-right">',
            '<button type="button" data-action="undo">撤销</button>',
            '<button type="button" data-action="select"' + (selectionMode === 'batch' ? ' disabled' : '') + '>' + (selectionMode === 'batch' ? '正在选择' : '继续选择') + '</button>',
            '<button type="button" data-primary="true" data-action="send">创建 AI 任务</button>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
    sidebar.dataset.collapsed = batchSidebarCollapsed ? 'true' : 'false';
    const list = sidebar.querySelector('.ui-inspect-sidebar-list');
    if (list) {
      if (!selectedTargets.length) {
        list.innerHTML = '<div class="ui-inspect-sidebar-empty">暂无目标</div>';
      } else {
        list.innerHTML = selectedTargets.map((item, index) => targetCardHtml(item, index, true)).join('');
      }
    }
    wireTargetCards(sidebar, () => renderBatchSidebar());
    renderSidebarMessages(sidebar);
    sidebar.querySelector('.ui-inspect-sidebar-status').addEventListener('click', () => {
      if (!batchSidebarCollapsed) return;
      batchSidebarCollapsed = false;
      renderBatchSidebar();
    });
    sidebar.querySelector('[data-action="collapse"]').addEventListener('click', () => {
      batchSidebarCollapsed = true;
      renderBatchSidebar();
    });
    sidebar.querySelector('[data-action="close"]').addEventListener('click', () => closeDebugPanel());
    sidebar.querySelector('[data-action="history"]').addEventListener('click', () => openHistoryPanel());
    sidebar.querySelector('[data-action="undo"]').addEventListener('click', () => {
      if (!selectedTargets.length) return;
      selectedTargets.pop();
      renderBatchSidebar();
    });
    const undoButton = sidebar.querySelector('[data-action="undo"]');
    if (undoButton) undoButton.disabled = selectedTargets.length === 0;
    sidebar.querySelector('[data-action="select"]').addEventListener('click', () => {
      selectionMode = 'batch';
      setEnabled(true);
      batchSidebarCollapsed = window.innerWidth <= 520;
      renderBatchSidebar();
    });
    sidebar.querySelector('[data-action="send"]').addEventListener('click', () => sendCurrentTask(sidebar, sidebar.querySelector('#ui-inspect-batch-instruction')));
    if (activePanelSessionId && activeSessionData) startSessionStream(activePanelSessionId);
  }

  function renderTargets(panel) {
    const list = panel.querySelector('.ui-inspect-target-list');
    const target = panel.querySelector('.ui-inspect-target');
    if (!list || !target) return;
    target.textContent = describeTargets();
    target.dataset.empty = selectedTargets.length ? 'false' : 'true';
    list.innerHTML = selectedTargets.map((item, index) => targetCardHtml(item, index, activeTaskMode === 'batch')).join('');
    wireTargetCards(panel, () => renderTargets(panel));
  }

  function targetCardHtml(item, index, includeNote) {
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
        (includeNote ? '<input data-target-note value="' + escapeHtml(item.note || '') + '" placeholder="' + escapeHtml(targetNotePlaceholder()) + '" />' : '') +
      '</div>';
  }

  function wireTargetCards(root, rerender) {
    Array.from(root.querySelectorAll('[data-target-note]')).forEach((input) => {
      input.addEventListener('input', () => {
        const row = input.closest('[data-target-index]');
        const index = Number(row?.getAttribute('data-target-index'));
        if (Number.isInteger(index) && selectedTargets[index]) selectedTargets[index].note = input.value;
      });
    });
    Array.from(root.querySelectorAll('[data-action="remove-target"]')).forEach((button) => {
      button.addEventListener('click', () => {
        const row = button.closest('[data-target-index]');
        const index = Number(row?.getAttribute('data-target-index'));
        if (Number.isInteger(index)) selectedTargets.splice(index, 1);
        rerender();
      });
    });
    Array.from(root.querySelectorAll('[data-action="open-source"]')).forEach((button) => {
      button.addEventListener('click', () => {
        const row = button.closest('[data-target-index]');
        const index = Number(row?.getAttribute('data-target-index'));
        openSource(selectedTargets[index]?.selection, button).catch(() => { button.textContent = '打开失败'; showToast('编辑器未响应，请复制路径手动打开。', 'failed'); });
      });
    });
    Array.from(root.querySelectorAll('[data-action="copy-source"]')).forEach((button) => {
      button.addEventListener('click', () => {
        const row = button.closest('[data-target-index]');
        const index = Number(row?.getAttribute('data-target-index'));
        copySource(selectedTargets[index]?.selection, button).catch(() => { button.textContent = '复制失败'; });
      });
    });
  }

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
      if (activeTaskMode === 'single') selectedTargets = [targetFromSelection(draft, '')];
      else selectedTargets.push(targetFromSelection(draft, ''));
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
      '<div class="ui-inspect-head"><div class="ui-inspect-title">历史记录</div><button type="button" class="ui-inspect-close" data-action="close" aria-label="关闭">×</button></div>',
      '<div class="ui-inspect-target">正在读取历史记录...</div>',
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
      openModeMenu();
    });
    function renderHistoryList(sessions) {
      const list = panel.querySelector('.ui-inspect-session-list');
      const target = panel.querySelector('.ui-inspect-target');
      if (!sessions.length) {
        target.textContent = '暂无历史记录。';
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
            target.textContent = friendlyError(err, 'history');
            button.textContent = '删除';
          });
        });
      });
    }
    fetchSessions().then((sessions) => {
      renderHistoryList(sessions);
    }).catch((err) => {
      panel.querySelector('.ui-inspect-target').textContent = friendlyError(err, 'history');
    });
  }

  function openSessionPanel(session) {
    activeElement = null;
    selectedTargets = targetsFromSession(session);
    activeSessionData = session;
    activePanelSessionId = session.id;
    activeSessionId = session.id;
    localStorage.setItem(LAST_SESSION_KEY, activeSessionId);
    if (session.mode === 'troubleshoot') {
      activeTaskMode = 'troubleshoot';
      selectionMode = 'done';
      openDebugPanel({ session, sessionId: session.id });
      return;
    }
    if (session.mode === 'batch' || selectedTargets.length > 1) {
      removePanel();
      activeTaskMode = 'batch';
      selectionMode = 'done';
      batchSidebarCollapsed = false;
      renderBatchSidebar();
      startSessionStream(session.id);
      return;
    }
    activeTaskMode = session.mode === 'troubleshoot' ? 'troubleshoot' : 'single';
    openDebugPanel({ session, sessionId: session.id });
  }

  document.addEventListener('keydown', (event) => {
    if (event.altKey && event.shiftKey && event.code === 'KeyI') {
      event.preventDefault();
      openModeMenu();
    }
  }, true);

  document.addEventListener('mousemove', (event) => {
    if (!enabled) return;
    updateHover(event.target);
  }, true);

  document.addEventListener('click', (event) => {
    if (isOwnNode(event.target)) return;
    const el = hovered && !isOwnNode(hovered) ? hovered : event.target;
    if (event.altKey && !isOwnNode(el)) {
      const selection = selectionPayloadFor(el, '', activePanelSessionId || undefined);
      event.preventDefault();
      event.stopPropagation();
      if (!selection?.source?.file) {
        showToast('Diana 没有识别到这个元素的源码位置', 'failed');
        return;
      }
      activeElement = el;
      highlightElement(el);
      openSourceConfirmPanel(selection);
      return;
    }
    if (!enabled) return;
    if (!el || isOwnNode(el)) return;
    event.preventDefault();
    event.stopPropagation();
    const sessionId = reselectSessionId;
    reselectSessionId = null;
    if (selectionMode === 'source') {
      const selection = selectionPayloadFor(el, '', sessionId || activePanelSessionId || undefined);
      setEnabled(false);
      if (!selection?.source?.file) {
        showToast('Diana 没有识别到这个元素的源码位置', 'failed');
        return;
      }
      activeElement = el;
      highlightElement(el);
      openSourceConfirmPanel(selection);
      return;
    }
    if (selectionMode === 'batch') {
      const selection = selectionPayloadFor(el, '', sessionId || activePanelSessionId || undefined);
      activeElement = el;
      selectedTargets.push(targetFromSelection(selection, ''));
      highlightElement(el);
      setEnabled(true);
      openBatchSidebar();
      return;
    }
    if (selectionMode === 'troubleshoot') {
      activeTaskMode = 'troubleshoot';
      openDebugPanel({ element: el, sessionId: sessionId || activePanelSessionId || undefined });
      return;
    }
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
    const sidebar = document.getElementById(BATCH_SIDEBAR_ID);
    const root = panel || sidebar;
    if (!root) return;
    const messagesEl = root.querySelector('.ui-inspect-messages');
    const statusEl = root.querySelector('.ui-inspect-status') || root.querySelector('.ui-inspect-sidebar-status');
    if (statusEl) statusEl.textContent = statusText(session.status) + (sidebar ? ' · 已选择 ' + selectedTargets.length + ' 个目标' : '');
    if (session.status) setDianaState(session.status);
    if (!messagesEl) return;
    renderMessages(messagesEl, session.messages || []);
  }

  function renderSidebarMessages(sidebar) {
    const messagesEl = sidebar.querySelector('.ui-inspect-messages');
    if (!messagesEl) return;
    renderMessages(messagesEl, activeSessionData?.messages || []);
  }

  function renderMessages(messagesEl, messages) {
    messagesEl.innerHTML = messages.map((message) => (
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
      setDianaState('working');
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
  installRuntimeCapture();
  ensureToggle();
  document.addEventListener('pointermove', moveDiana, true);
  document.addEventListener('pointerup', endDianaDrag, true);
  document.addEventListener('pointercancel', endDianaDrag, true);
  window.addEventListener('resize', refreshDianaPosition);
})();`;
}
