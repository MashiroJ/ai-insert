import type { Plugin } from 'vite';
export interface AiInspectPluginOptions {
    daemonUrl?: string;
    enabled?: boolean;
}
export declare function aiInspect(options?: AiInspectPluginOptions): Plugin;
export default aiInspect;
