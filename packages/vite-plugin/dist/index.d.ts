import type { Plugin } from 'vite';
export interface UiInspectPluginOptions {
    daemonUrl?: string;
    enabled?: boolean;
}
export declare function uiInspect(options?: UiInspectPluginOptions): Plugin;
export default uiInspect;
