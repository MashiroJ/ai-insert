/**
 * CSS Styles for ui-inspect browser UI
 */

/**
 * Get all CSS rules as a string
 */
export function getStyles(): string {
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
export function highlightBoxStyles(): string {
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
export function dianaStyles(): string {
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
export function menuStyles(): string {
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
export function toastStyles(): string {
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
export function batchSidebarStyles(): string {
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
`;
}

/**
 * Install styles into document
 */
export function installStyles(): void {
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
export function removeStyles(): void {
  const style = document.getElementById('ui-inspect-style');
  if (style && style.parentNode) {
    style.parentNode.removeChild(style);
  }
}
