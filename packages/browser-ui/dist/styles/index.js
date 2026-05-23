/**
 * CSS Styles for ui-inspect browser UI
 */
/**
 * Get all CSS rules as a string
 */
export function getStyles() {
    return [
        highlightBoxStyles(),
        dianaStyles(),
        menuStyles(),
        toastStyles(),
        batchSidebarStyles(),
    ].join('\n');
}
/**
 * Highlight box styles
 */
export function highlightBoxStyles() {
    return `
#ui-inspect-box {
  position: fixed;
  z-index: 2147483646;
  pointer-events: none;
  border: 1px solid rgba(59, 130, 246, 0.82);
  background: rgba(96, 165, 250, 0.12);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.62) inset;
  display: none;
}
`;
}
/**
 * Diana toggle styles
 */
export function dianaStyles() {
    return `
#ui-inspect-toggle {
  position: fixed;
  z-index: 2147483647;
  right: 12px;
  bottom: 12px;
  width: 72px;
  height: 78px;
  border: 0;
  background: transparent;
  color: white;
  padding: 0;
  cursor: grab;
  touch-action: none;
  user-select: none;
  filter: drop-shadow(0 14px 24px rgba(15, 23, 42, 0.4));
  transform-origin: 50% 100%;
  outline: none;
}

#ui-inspect-toggle[data-dragging="true"] {
  cursor: grabbing;
}

#ui-inspect-toggle:focus {
  outline: none;
}

#ui-inspect-toggle:focus-visible {
  filter: drop-shadow(0 0 0 rgba(0,0,0,0)) drop-shadow(0 0 16px rgba(96,165,250,0.55));
}

#ui-inspect-toggle:hover {
  transform: translateY(-2px);
}

#ui-inspect-toggle[data-active="true"] {
  filter: drop-shadow(0 0 0 rgba(0,0,0,0)) drop-shadow(0 14px 30px rgba(37,99,235,0.45));
}

#ui-inspect-toggle .ui-inspect-diana {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 72px;
  height: 78px;
  background-image: url("/@ui-inspect/diana.webp");
  background-repeat: no-repeat;
  background-size: 576px 702px;
  background-position: 0 0;
  image-rendering: auto;
  animation: ui-diana-idle 3600ms steps(6) infinite;
}

#ui-inspect-toggle[data-direction="left"] .ui-inspect-diana {
  transform: scaleX(-1);
}

#ui-inspect-toggle[data-direction="right"] .ui-inspect-diana {
  transform: scaleX(1);
}

#ui-inspect-toggle .ui-inspect-diana {
  transform-origin: 50% 50%;
}

#ui-inspect-toggle[data-state="standby"] .ui-inspect-diana {
  animation: ui-diana-standby 3000ms steps(6) infinite;
}

#ui-inspect-toggle[data-state="selecting"] .ui-inspect-diana {
  animation: ui-diana-read 2400ms steps(6) infinite;
}

#ui-inspect-toggle[data-state="scan"] .ui-inspect-diana {
  animation: ui-diana-scan 1200ms steps(8) infinite;
}

#ui-inspect-toggle[data-state="sent"] .ui-inspect-diana,
#ui-inspect-toggle[data-state="write"] .ui-inspect-diana {
  animation: ui-diana-write 1800ms steps(4) infinite;
}

#ui-inspect-toggle[data-state="claimed"] .ui-inspect-diana,
#ui-inspect-toggle[data-state="read"] .ui-inspect-diana {
  animation: ui-diana-read 2400ms steps(6) infinite;
}

#ui-inspect-toggle[data-state="working"] .ui-inspect-diana,
#ui-inspect-toggle[data-state="process"] .ui-inspect-diana {
  animation: ui-diana-process 1200ms steps(6) infinite;
}

#ui-inspect-toggle[data-state="done"] .ui-inspect-diana,
#ui-inspect-toggle[data-state="rest"] .ui-inspect-diana {
  animation: ui-diana-rest 1800ms steps(5) infinite;
}

#ui-inspect-toggle[data-state="failed"] .ui-inspect-diana {
  animation: ui-diana-sad 2200ms steps(8) infinite;
}

#ui-inspect-toggle[data-state="run"] .ui-inspect-diana {
  animation: ui-diana-run 900ms steps(8) infinite;
}

#ui-inspect-toggle[data-dragging="true"] .ui-inspect-diana {
  animation: ui-diana-run 900ms steps(8) infinite;
}

@keyframes ui-diana-idle {
  from { background-position: 0 0; }
  to { background-position: -432px 0; }
}

@keyframes ui-diana-run {
  from { background-position: 0 -78px; }
  to { background-position: -576px -78px; }
}

@keyframes ui-diana-scan {
  from { background-position: 0 -156px; }
  to { background-position: -576px -156px; }
}

@keyframes ui-diana-write {
  from { background-position: 0 -234px; }
  to { background-position: -288px -234px; }
}

@keyframes ui-diana-rest {
  from { background-position: 0 -312px; }
  to { background-position: -360px -312px; }
}

@keyframes ui-diana-sad {
  from { background-position: 0 -390px; }
  to { background-position: -576px -390px; }
}

@keyframes ui-diana-standby {
  from { background-position: 0 -468px; }
  to { background-position: -432px -468px; }
}

@keyframes ui-diana-process {
  from { background-position: 0 -546px; }
  to { background-position: -432px -546px; }
}

@keyframes ui-diana-read {
  from { background-position: 0 -624px; }
  to { background-position: -432px -624px; }
}
`;
}
/**
 * Mode menu styles
 */
export function menuStyles() {
    return `
#ui-inspect-menu {
  position: fixed;
  z-index: 2147483647;
  right: 22px;
  bottom: 102px;
  width: 48px;
  background: rgba(15, 23, 42, 0.78);
  color: white;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.38);
  padding: 7px 0;
  font: 12px/1 ui-sans-serif, system-ui, -apple-system, sans-serif;
  backdrop-filter: blur(10px);
  cursor: auto;
}

#ui-inspect-menu .ui-inspect-menu-head {
  display: none;
}

#ui-inspect-menu .ui-inspect-menu-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

#ui-inspect-menu button {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #f8fafc;
  padding: 0;
  cursor: pointer;
  outline: none;
}

#ui-inspect-menu button svg {
  width: 21px;
  height: 21px;
  display: block;
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

#ui-inspect-menu button:focus {
  outline: none;
}

#ui-inspect-menu button:focus-visible,
#ui-inspect-menu button:hover {
  background: rgba(96, 165, 250, 0.18);
  color: white;
}

#ui-inspect-menu .ui-inspect-menu-divider {
  width: 24px;
  height: 1px;
  background: rgba(226, 232, 240, 0.28);
  margin: 2px 0;
}

#ui-inspect-menu .ui-inspect-menu-desc {
  position: absolute;
  right: 46px;
  top: 50%;
  transform: translateY(-50%);
  display: none;
  white-space: nowrap;
  border-radius: 8px;
  background: rgba(71, 85, 105, 0.92);
  color: #f8fafc;
  padding: 9px 11px;
  font-size: 14px;
  line-height: 1;
  font-weight: 800;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.28);
  pointer-events: none;
}

#ui-inspect-menu button:hover .ui-inspect-menu-desc,
#ui-inspect-menu button:focus-visible .ui-inspect-menu-desc {
  display: block;
}

#ui-inspect-menu[data-side="right"] .ui-inspect-menu-desc {
  left: 46px;
  right: auto;
}

#ui-inspect-menu .ui-inspect-menu-secondary {
  color: #cbd5e1;
}
`;
}
/**
 * Toast notification styles
 */
export function toastStyles() {
    return `
#ui-inspect-toast {
  position: fixed;
  z-index: 2147483647;
  right: 22px;
  bottom: 112px;
  max-width: min(300px, calc(100vw - 44px));
  border: 1px solid rgba(96, 165, 250, 0.42);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.94);
  color: #dbeafe;
  padding: 8px 10px;
  font: 12px/1.45 ui-sans-serif, system-ui, -apple-system, sans-serif;
  font-weight: 800;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.36);
}
`;
}
/**
 * Batch sidebar styles
 */
export function batchSidebarStyles() {
    return `
#ui-inspect-batch-sidebar {
  position: fixed;
  z-index: 2147483647;
  right: 16px;
  top: 16px;
  bottom: 108px;
  width: min(400px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  background: #0b1220;
  color: white;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 8px;
  box-shadow: 0 20px 54px rgba(0, 0, 0, 0.38);
  padding: 0;
  font: 13px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif;
  overflow: hidden;
}

#ui-inspect-batch-sidebar[data-collapsed="true"] {
  top: auto;
  left: 16px;
  right: auto;
  bottom: 18px;
  width: auto;
  min-width: 156px;
  height: auto;
  padding: 0;
  border-radius: 999px;
}

#ui-inspect-batch-sidebar[data-collapsed="true"] .ui-inspect-sidebar-list,
#ui-inspect-batch-sidebar[data-collapsed="true"] .ui-inspect-messages,
#ui-inspect-batch-sidebar[data-collapsed="true"] .ui-inspect-sidebar-footer,
#ui-inspect-batch-sidebar[data-collapsed="true"] .ui-inspect-sidebar-close {
  display: none;
}

#ui-inspect-batch-sidebar[data-collapsed="true"] .ui-inspect-sidebar-head {
  display: none;
}

#ui-inspect-batch-sidebar[data-collapsed="true"] .ui-inspect-sidebar-status {
  margin: 0;
  padding: 9px 12px;
  border-radius: 999px;
  cursor: pointer;
}

#ui-inspect-batch-sidebar,
#ui-inspect-batch-sidebar * {
  cursor: auto !important;
}

#ui-inspect-batch-sidebar .ui-inspect-sidebar-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 12px 11px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  background: #111827;
}

#ui-inspect-batch-sidebar .ui-inspect-sidebar-title {
  color: #f8fafc;
  font-size: 14px;
  font-weight: 900;
}

#ui-inspect-batch-sidebar .ui-inspect-sidebar-subtitle {
  margin-top: 2px;
  color: #94a3b8;
  font: 11px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 800;
}

#ui-inspect-batch-sidebar .ui-inspect-sidebar-close {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 7px !important;
  line-height: 1;
  font-size: 18px;
  background: #1f2937;
  border-color: #334155;
  color: #e2e8f0;
}

#ui-inspect-batch-sidebar .ui-inspect-sidebar-status {
  display: inline-flex;
  align-self: flex-start;
  margin: 10px 12px 8px;
  padding: 4px 8px;
  border: 1px solid rgba(34, 197, 94, 0.34);
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.1);
  color: #bbf7d0;
  font-size: 11px;
  font-weight: 900;
}

#ui-inspect-batch-sidebar .ui-inspect-sidebar-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
  overflow: auto;
  flex: 1;
  margin: 0;
  padding: 0 12px 10px;
  scrollbar-width: thin;
}

#ui-inspect-batch-sidebar .ui-inspect-sidebar-empty {
  border: 1px dashed rgba(148, 163, 184, 0.28);
  border-radius: 8px;
  color: #94a3b8;
  background: #0f172a;
  padding: 18px 14px;
  font-weight: 800;
  text-align: center;
}

#ui-inspect-batch-sidebar .ui-inspect-sidebar-footer {
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  background: #111827;
  padding: 10px 12px 12px;
}

#ui-inspect-batch-sidebar .ui-inspect-sidebar-footer label {
  display: block;
  margin: 0 0 6px;
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 900;
}

#ui-inspect-panel[data-mode="css-debug"] {
  width: min(520px, calc(100vw - 32px));
  max-height: min(760px, calc(100vh - 72px));
  overflow: auto;
}

#ui-inspect-panel[data-mode="css-debug"] .ui-inspect-head {
  cursor: grab !important;
}

#ui-inspect-panel .ui-inspect-css-toolbar {
  display: flex;
  justify-content: flex-end;
  margin: 0 0 8px;
}

#ui-inspect-panel .ui-inspect-css-toolbar button {
  padding: 5px 8px;
  border-radius: 999px;
  font-size: 11px;
}

#ui-inspect-panel .ui-inspect-css-toolbar button[aria-pressed="true"] {
  border-color: #60a5fa;
  background: rgba(37, 99, 235, 0.28);
  color: #dbeafe;
}

#ui-inspect-panel .ui-inspect-css-groups {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  max-height: 360px;
  overflow: auto;
  padding-right: 2px;
}

#ui-inspect-panel .ui-inspect-css-group {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
  padding: 9px;
}

#ui-inspect-panel .ui-inspect-css-group-title {
  margin: 0;
  color: #bfdbfe;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  list-style: none;
}

#ui-inspect-panel .ui-inspect-css-group-title::-webkit-details-marker {
  display: none;
}

#ui-inspect-panel .ui-inspect-css-group-title::after {
  content: "+";
  float: right;
  color: #64748b;
}

#ui-inspect-panel .ui-inspect-css-group[open] .ui-inspect-css-group-title {
  margin-bottom: 7px;
}

#ui-inspect-panel .ui-inspect-css-group[open] .ui-inspect-css-group-title::after {
  content: "-";
}

#ui-inspect-panel .ui-inspect-css-row {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr) minmax(0, 148px);
  gap: 7px;
  align-items: center;
  margin: 6px 0 0;
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 800;
}

#ui-inspect-panel .ui-inspect-css-row:first-of-type {
  margin-top: 0;
}

#ui-inspect-panel .ui-inspect-css-row input,
#ui-inspect-panel .ui-inspect-css-row select {
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  border: 1px solid #334155;
  border-radius: 6px;
  background: #020617;
  color: white;
  padding: 6px 7px;
  font: 12px/1.35 ui-sans-serif, system-ui, -apple-system, sans-serif;
  outline: none;
}

#ui-inspect-panel .ui-inspect-css-row input[type="range"] {
  padding: 0;
  accent-color: #60a5fa;
}

#ui-inspect-panel .ui-inspect-css-row input[type="color"] {
  height: 31px;
  padding: 2px;
}

#ui-inspect-panel .ui-inspect-css-row input:focus,
#ui-inspect-panel .ui-inspect-css-row select:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.22);
}

#ui-inspect-panel .ui-inspect-css-diff {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 9px 0 8px;
  padding: 8px;
  border: 1px solid rgba(34, 197, 94, 0.24);
  border-radius: 8px;
  background: rgba(20, 83, 45, 0.14);
  color: #dcfce7;
  font-size: 12px;
  font-weight: 800;
}

#ui-inspect-panel .ui-inspect-css-diff-title {
  color: #86efac;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0;
}

#ui-inspect-panel .ui-inspect-css-diff div {
  display: grid;
  grid-template-columns: minmax(90px, auto) minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 6px;
  align-items: center;
}

#ui-inspect-panel .ui-inspect-css-diff .ui-inspect-css-effect,
#ui-inspect-panel .ui-inspect-css-diff .ui-inspect-css-warning {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

#ui-inspect-panel .ui-inspect-css-diff .ui-inspect-css-effect b,
#ui-inspect-panel .ui-inspect-css-diff .ui-inspect-css-warning b {
  color: #bfdbfe;
  font-size: 11px;
}

#ui-inspect-panel .ui-inspect-css-diff .ui-inspect-css-warning b {
  color: #fde68a;
}

#ui-inspect-panel .ui-inspect-css-diff code {
  color: #93c5fd;
  font: 11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace;
}

#ui-inspect-panel .ui-inspect-css-diff span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #d1fae5;
}

#ui-inspect-panel .ui-inspect-css-empty {
  display: block !important;
  color: #94a3b8;
}

#ui-inspect-panel .ui-inspect-css-empty-controls {
  border: 1px dashed rgba(148, 163, 184, 0.28);
  border-radius: 8px;
  padding: 10px;
  background: rgba(15, 23, 42, 0.54);
  font-weight: 800;
}

#ui-inspect-panel[data-mode="css-debug"][data-sent="true"] .ui-inspect-css-groups,
#ui-inspect-panel[data-mode="css-debug"][data-sent="true"] textarea {
  opacity: 0.72;
}

html[data-ui-inspect-css-debug="true"] #ui-inspect-box {
  opacity: 0.42;
}

#ui-inspect-css-overlay {
  position: fixed;
  z-index: 2147483646;
  display: none;
  pointer-events: none;
  border: 1px solid rgba(59, 130, 246, 0.86);
  background: rgba(96, 165, 250, 0.1);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.58) inset;
}

#ui-inspect-css-overlay [data-css-debug-handle] {
  position: absolute;
  pointer-events: auto;
  box-sizing: border-box;
  border: 1px solid rgba(219, 234, 254, 0.95);
  border-radius: 6px;
  background: #2563eb;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.34);
  padding: 0;
  outline: none;
}

#ui-inspect-css-overlay [data-css-debug-handle]:focus-visible {
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.36);
}

#ui-inspect-css-overlay [data-css-debug-handle="move"] {
  top: -24px;
  left: -1px;
  width: 42px;
  height: 18px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.9);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.24);
  cursor: move;
}

#ui-inspect-css-overlay [data-css-debug-handle="move"]::before {
  content: "";
  position: absolute;
  left: 12px;
  right: 12px;
  top: 5px;
  bottom: 5px;
  border-top: 2px solid rgba(255, 255, 255, 0.88);
  border-bottom: 2px solid rgba(255, 255, 255, 0.88);
}

#ui-inspect-css-overlay [data-css-debug-handle="e"] {
  top: 50%;
  right: -6px;
  width: 12px;
  height: 32px;
  transform: translateY(-50%);
  cursor: ew-resize;
}

#ui-inspect-css-overlay [data-css-debug-handle="s"] {
  left: 50%;
  bottom: -6px;
  width: 32px;
  height: 12px;
  transform: translateX(-50%);
  cursor: ns-resize;
}

#ui-inspect-css-overlay [data-css-debug-handle="se"] {
  right: -7px;
  bottom: -7px;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
}

#ui-inspect-panel .ui-inspect-css-interaction {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 6px;
  align-items: center;
  margin: -2px 0 8px;
  padding: 7px 8px;
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 8px;
  background: rgba(30, 64, 175, 0.14);
  color: #dbeafe;
  font-size: 12px;
  font-weight: 800;
}

#ui-inspect-panel .ui-inspect-css-interaction b {
  color: #bfdbfe;
  font-size: 11px;
}

#ui-inspect-panel .ui-inspect-css-interaction span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 560px) {
  #ui-inspect-panel .ui-inspect-css-row {
    grid-template-columns: 1fr;
  }
}
`;
}
/**
 * Install styles into document
 */
export function installStyles() {
    const styleId = 'ui-inspect-style';
    if (document.getElementById(styleId)) {
        return;
    }
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = getStyles();
    document.head.appendChild(style);
}
/**
 * Remove styles from document
 */
export function removeStyles() {
    const style = document.getElementById('ui-inspect-style');
    if (style && style.parentNode) {
        style.parentNode.removeChild(style);
    }
}
//# sourceMappingURL=index.js.map