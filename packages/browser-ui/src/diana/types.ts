/**
 * Diana component types
 */

export type DianaState =
  | 'idle'          // 默认状态
  | 'standby'       // 待命/菜单打开
  | 'selecting'     // 选择元素中
  | 'sent'          // 已发送
  | 'claimed'       // AI 已接收
  | 'working'       // AI 处理中
  | 'done'          // 完成
  | 'failed'        // 失败
  | 'run'           // 快速移动
  | 'scan'          // 巡航/扫描
  | 'write'         // 写入数据
  | 'rest'          // 休息/收束
  | 'process'       // 执行处理
  | 'read';         // 读取数据

export type DianaDirection = 'left' | 'right';

export interface DianaPosition {
  x: number;
  y: number;
}

export interface DianaOptions {
  id?: string;
  spriteUrl?: string;
  initialState?: DianaState;
  onDragStart?: () => void;
  onDragEnd?: (position: DianaPosition) => void;
  onClick?: () => void;
  onHover?: () => void;
  onMenuOpen?: () => void;
}

export interface DianaStateInfo {
  state: DianaState;
  text: string;
  temporary?: boolean;
}
