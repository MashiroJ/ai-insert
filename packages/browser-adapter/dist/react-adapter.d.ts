/**
 * React framework adapter
 *
 * Provides React-specific functionality through React Fiber and DevTools.
 * Supports React 16.8+ (hooks) and React 18+.
 */
import type { ComponentInfo, ComponentTreeNode, FrameworkAdapter, SourceHint, SourceLocation, PropValue, StateValue, DevToolsCallback } from './interfaces.js';
/**
 * Enhanced React adapter implementation
 */
export declare class ReactAdapter implements FrameworkAdapter {
    readonly name = "react";
    version?: string;
    private devToolsCleanup;
    private renderer;
    constructor();
    /**
     * Detect React version from global objects
     */
    private detectReactVersion;
    /**
     * Attach to React DevTools if available
     */
    private attachToDevTools;
    getComponentInfo(element: HTMLElement): ComponentInfo | null;
    getComponentChain(element: HTMLElement): ComponentInfo[];
    getComponentTree(element: HTMLElement): ComponentTreeNode;
    getSourceLocation(element: HTMLElement): SourceLocation | null;
    getSourceHints(element: HTMLElement): SourceHint[];
    getComponentProps(element: HTMLElement): Record<string, PropValue>;
    getComponentState(element: HTMLElement): Record<string, StateValue> | null;
    isAvailable(): boolean;
    installDevToolsHook(callback: DevToolsCallback): () => void;
    /**
     * Find the React fiber node for an element
     */
    private findFiber;
    /**
     * Get component name from element type
     */
    private getComponentName;
    /**
     * Get display name for component
     */
    private getDisplayName;
    /**
     * Get source file from fiber node
     */
    private getSourceFileFromFiber;
    /**
     * Get a unique ID for a fiber node
     */
    private getFiberId;
    /**
     * Sanitize props for safe transmission
     */
    private sanitizeProps;
    /**
     * Sanitize a value for safe transmission
     */
    private sanitizeValue;
}
/**
 * Singleton instance
 */
export declare const reactAdapter: ReactAdapter;
//# sourceMappingURL=react-adapter.d.ts.map