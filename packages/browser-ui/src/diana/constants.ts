/**
 * Diana component constants
 */

export const DIANA_SPRITE_URL = '/@ui-inspect/diana.webp';

export const TOGGLE_ID = 'ui-inspect-toggle';
export const MENU_ID = 'ui-inspect-menu';
export const TOAST_ID = 'ui-inspect-toast';

export const POSITION_KEY = 'ui-inspect:diana-position';
export const DIRECTION_KEY = 'ui-inspect:diana-direction';

export const DIANA_SIZE = { width: 72, height: 78 };

// Animation timings (in ms)
export const ANIMATION_DURATION = {
  idle: 3600,
  run: 900,
  scan: 1200,
  write: 1800,
  rest: 1800,
  sad: 2200,
  standby: 3000,
  process: 1200,
  read: 2400,
} as const;

// Sprite positions
export const SPRITE_POSITION = {
  idle: { x: 0, y: 0 },
  run: { x: 0, y: -78 },
  scan: { x: 0, y: -156 },
  write: { x: 0, y: -234 },
  rest: { x: 0, y: -312 },
  sad: { x: 0, y: -390 },
  standby: { x: 0, y: -468 },
  process: { x: 0, y: -546 },
  read: { x: 0, y: -624 },
} as const;

export const STATE_TEXT: Record<string, string> = {
  idle: '',
  standby: '待命中',
  selecting: '读取元素...',
  sent: '写入数据...',
  claimed: '读取数据...',
  working: '执行中...',
  done: '完成',
  failed: '失败',
  run: '移动中',
  scan: '扫描中',
  write: '写入数据...',
  rest: '休息中',
  process: '执行中',
  read: '读取数据...',
};

export const ICONS = {
  source: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
  edit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
  troubleshoot: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  batch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
  history: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
} as const;
