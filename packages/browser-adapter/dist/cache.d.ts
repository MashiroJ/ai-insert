/**
 * Integration of cache utilities into browser-adapter
 *
 * Adds caching layer to framework adapters for better performance.
 */
import type { DevToolsCallback, FrameworkAdapter } from './interfaces.js';
/**
 * Cached wrapper for framework adapters
 */
export declare class CachedFrameworkAdapter implements FrameworkAdapter {
    private baseAdapter;
    readonly name: string;
    version?: string;
    private componentInfoCache;
    private componentChainCache;
    private componentTreeCache;
    private sourceLocationCache;
    private sourceHintsCache;
    constructor(baseAdapter: FrameworkAdapter);
    getComponentInfo(element: HTMLElement): import("./interfaces.js").ComponentInfo | null;
    getComponentChain(element: HTMLElement): import("./interfaces.js").ComponentInfo[];
    getComponentTree(element: HTMLElement): import("./interfaces.js").ComponentTreeNode;
    getSourceLocation(element: HTMLElement): import("./interfaces.js").SourceLocation | null;
    getSourceHints(element: HTMLElement): import("./interfaces.js").SourceHint[];
    getComponentProps(element: HTMLElement): Record<string, import("./interfaces.js").PropValue>;
    getComponentState(element: HTMLElement): Record<string, import("./interfaces.js").PropValue> | null;
    isAvailable(): boolean;
    installDevToolsHook?(callback: DevToolsCallback): () => void;
    /**
     * Clear any cached data
     */
    clearCache(): void;
    private getCached;
}
/**
 * Wrap an adapter with caching layer
 */
export declare function withCaching(adapter: FrameworkAdapter): FrameworkAdapter;
//# sourceMappingURL=cache.d.ts.map