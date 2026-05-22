/**
 * Diana component types
 */
export type DianaState = 'idle' | 'standby' | 'selecting' | 'sent' | 'claimed' | 'working' | 'done' | 'failed' | 'run' | 'scan' | 'write' | 'rest' | 'process' | 'read';
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
//# sourceMappingURL=types.d.ts.map