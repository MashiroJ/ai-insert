// Generated browser client source fragment for CSS Debug.
export const cssDebugRuntimeStyleClientSource = `
  function installCssDebugRuntimeStyle() {
    if (document.getElementById('ui-inspect-css-runtime-style')) return;
    const style = document.createElement('style');
    style.id = 'ui-inspect-css-runtime-style';
    style.textContent = [
      '#' + CSS_DEBUG_OVERLAY_ID + '{position:fixed;z-index:2147483646;display:none;pointer-events:none;border:1px solid rgba(37,99,235,.92);background:rgba(59,130,246,.08);box-shadow:0 0 0 1px rgba(255,255,255,.72) inset,0 10px 28px rgba(37,99,235,.18)}',
      '#' + CSS_DEBUG_BOUNDARY_OVERLAY_ID + '{position:fixed;z-index:2147483645;display:none;pointer-events:none;border:1px dashed rgba(14,165,233,.78);background:rgba(14,165,233,.045);box-shadow:0 0 0 9999px rgba(15,23,42,.015) inset}',
      '#' + CSS_DEBUG_BOUNDARY_OVERLAY_ID + '[data-clamped=\"true\"]{border-color:rgba(245,158,11,.92);background:rgba(245,158,11,.07)}',
      '#' + CSS_DEBUG_PREVIEW_OVERLAY_ID + '{position:fixed;z-index:2147483644;display:none;pointer-events:none;border:1px dashed rgba(34,197,94,.72);background:rgba(34,197,94,.055)}',
      '#' + CSS_DEBUG_OVERLAY_ID + ' [data-css-debug-handle]{position:absolute;pointer-events:auto;box-sizing:border-box;border:1px solid rgba(219,234,254,.95);border-radius:6px;background:#2563eb;box-shadow:0 4px 12px rgba(15,23,42,.34);padding:0;outline:none}',
      '#' + CSS_DEBUG_OVERLAY_ID + ' [data-css-debug-handle]:focus-visible{box-shadow:0 0 0 3px rgba(96,165,250,.36)}',
      '#' + CSS_DEBUG_OVERLAY_ID + ' [data-css-debug-handle=\"move\"]{top:-24px;left:-1px;width:42px;height:18px;border-radius:999px;background:rgba(37,99,235,.9);box-shadow:0 6px 16px rgba(15,23,42,.24);cursor:move}',
      '#' + CSS_DEBUG_OVERLAY_ID + ' [data-css-debug-handle=\"move\"]:before{content:\"\";position:absolute;left:12px;right:12px;top:5px;bottom:5px;border-top:2px solid rgba(255,255,255,.88);border-bottom:2px solid rgba(255,255,255,.88)}',
      '#' + CSS_DEBUG_OVERLAY_ID + ' [data-css-debug-handle=\"e\"]{top:50%;right:-6px;width:12px;height:32px;transform:translateY(-50%);cursor:ew-resize}',
      '#' + CSS_DEBUG_OVERLAY_ID + ' [data-css-debug-handle=\"w\"]{top:50%;left:-6px;width:12px;height:32px;transform:translateY(-50%);cursor:ew-resize}',
      '#' + CSS_DEBUG_OVERLAY_ID + ' [data-css-debug-handle=\"s\"]{left:50%;bottom:-6px;width:32px;height:12px;transform:translateX(-50%);cursor:ns-resize}',
      '#' + CSS_DEBUG_OVERLAY_ID + ' [data-css-debug-handle=\"n\"]{left:50%;top:-6px;width:32px;height:12px;transform:translateX(-50%);cursor:ns-resize}',
      '#' + CSS_DEBUG_OVERLAY_ID + ' [data-css-debug-handle=\"se\"]{right:-7px;bottom:-7px;width:14px;height:14px;cursor:nwse-resize}',
      '#' + CSS_DEBUG_OVERLAY_ID + ' [data-css-debug-handle=\"sw\"]{left:-7px;bottom:-7px;width:14px;height:14px;cursor:nesw-resize}',
      '#' + CSS_DEBUG_OVERLAY_ID + ' [data-css-debug-handle=\"ne\"]{right:-7px;top:-7px;width:14px;height:14px;cursor:nesw-resize}',
      '#' + CSS_DEBUG_OVERLAY_ID + ' [data-css-debug-handle=\"nw\"]{left:-7px;top:-7px;width:14px;height:14px;cursor:nwse-resize}',
      '#' + CSS_DEBUG_OVERLAY_ID + ' .ui-inspect-box-model{position:absolute;pointer-events:none;box-sizing:border-box}',
      '#' + CSS_DEBUG_OVERLAY_ID + ' .ui-inspect-box-model-margin{border:1px dashed rgba(255,100,200,.6);background:repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,100,200,.08) 3px,rgba(255,100,200,.08) 6px)}',
      '#' + CSS_DEBUG_OVERLAY_ID + ' .ui-inspect-box-model-padding{border:1px dashed rgba(160,100,255,.6);background:repeating-linear-gradient(-45deg,transparent,transparent 3px,rgba(160,100,255,.08) 3px,rgba(160,100,255,.08) 6px)}',
      '#ui-inspect-css-controls{right:12px!important;top:12px!important;bottom:72px!important;width:min(400px,calc(100vw - 24px))!important;max-height:none!important;display:flex!important;flex-direction:column!important;border-radius:14px!important}',
      '#ui-inspect-css-controls .ui-inspect-css-groups{overflow:auto;padding:0 10px 8px;scrollbar-width:thin}',
      '#ui-inspect-css-controls .ui-inspect-css-row{display:grid!important;grid-template-columns:88px minmax(96px,1fr) minmax(92px,128px)!important;gap:8px!important;align-items:center!important}',
      '#ui-inspect-css-controls .ui-inspect-css-row span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#ui-inspect-css-controls .ui-inspect-drawer-footer{flex-wrap:wrap;justify-content:flex-end}',
      '#ui-inspect-css-controls .ui-inspect-css-toolbar-toggle{display:inline-flex;align-items:center;gap:4px;font:11px/1 ui-sans-serif,system-ui,sans-serif;font-weight:700;color:#94a3b8;cursor:pointer}',
      '#ui-inspect-css-controls .ui-inspect-css-toolbar-toggle input{margin:0;cursor:pointer}',
      '#ui-inspect-css-targets,#ui-inspect-css-send{right:16px!important;bottom:72px!important;border-radius:14px!important}',
      '#' + CSS_DEBUG_PICK_POPOVER_ID + '{position:fixed;z-index:2147483647;display:flex;align-items:center;gap:6px;padding:6px;border:1px solid rgba(147,197,253,.35);border-radius:999px;background:rgba(15,23,42,.94);color:#e2e8f0;box-shadow:0 14px 34px rgba(15,23,42,.32);font:12px/1 ui-sans-serif,system-ui,sans-serif;backdrop-filter:blur(12px)}',
      '#' + CSS_DEBUG_PICK_POPOVER_ID + ' span{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:800;color:#bfdbfe;padding:0 4px}',
      '#' + CSS_DEBUG_PICK_POPOVER_ID + ' button{border:1px solid #334155;border-radius:999px;background:#1f2937;color:#e2e8f0;padding:5px 10px;font:12px/1 ui-sans-serif,system-ui,sans-serif;font-weight:900;cursor:pointer}',
      '#' + CSS_DEBUG_PICK_POPOVER_ID + ' button[data-primary=\"true\"]{border-color:#2563eb;background:#2563eb;color:white}',
      '#' + CSS_DEBUG_SWAP_OVERLAY_ID + '{position:fixed;z-index:2147483644;display:none;pointer-events:none;border:2px solid rgba(168,85,247,.88);background:rgba(168,85,247,.1);border-radius:4px;transition:opacity .12s}',
      '#' + CSS_DEBUG_SWAP_OVERLAY_ID + '::after{content:attr(data-label);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:rgba(88,28,135,.92);color:#f3e8ff;padding:3px 10px;border-radius:6px;font:600 11px/1.4 ui-sans-serif,system-ui,sans-serif;white-space:nowrap;pointer-events:none}',
      '@media (max-width:720px){#ui-inspect-css-controls,#ui-inspect-css-targets,#ui-inspect-css-send{left:8px!important;right:8px!important;top:auto!important;bottom:66px!important;width:auto!important;max-height:52vh!important}#ui-inspect-css-controls .ui-inspect-css-row{grid-template-columns:1fr!important}}'
    ].join('\\n');
    document.head.appendChild(style);
  }
`;
//# sourceMappingURL=css-debug-runtime-style-source.js.map