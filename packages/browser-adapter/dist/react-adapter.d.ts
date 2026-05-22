/**
 * React framework adapter
 *
 * This adapter provides React-specific functionality through React DevTools.
 * Note: This is a placeholder implementation - full integration requires React DevTools hooks.
 */
import type { ComponentInfo, ComponentTreeNode, FrameworkAdapter, SourceHint, SourceLocation, PropValue, StateValue, DevToolsCallback } from './interfaces.js';
/**
 * React adapter implementation
 */
export declare class ReactAdapter implements FrameworkAdapter {
    readonly name = "react";
    readonly version?: string;
    private devToolsCleanup;
    constructor();
    getComponentInfo(element: HTMLElement): ComponentInfo | null;
    getComponentChain(element: HTMLElement): ComponentInfo[];
    getComponentTree(element: HTMLElement): ComponentTreeNode;
    getSourceLocation(): SourceLocation | null;
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