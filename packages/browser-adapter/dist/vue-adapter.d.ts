/**
 * Vue 3 framework adapter
 *
 * This adapter provides Vue-specific functionality through Vue's internal APIs.
 */
import type { ComponentInfo, ComponentTreeNode, FrameworkAdapter, SourceHint, SourceLocation, PropValue, StateValue } from './interfaces.js';
/**
 * Vue 3 adapter implementation
 */
export declare class Vue3Adapter implements FrameworkAdapter {
    readonly name = "vue3";
    readonly version?: string;
    constructor();
    getComponentInfo(element: HTMLElement): ComponentInfo | null;
    getComponentChain(element: HTMLElement): ComponentInfo[];
    getComponentTree(element: HTMLElement): ComponentTreeNode;
    getSourceLocation(element: HTMLElement): SourceLocation | null;
    getSourceHints(element: HTMLElement): SourceHint[];
    getComponentProps(element: HTMLElement): Record<string, PropValue>;
    getComponentState(element: HTMLElement): Record<string, StateValue> | null;
    isAvailable(): boolean;
    /**
     * Find the Vue component instance for an element
     */
    private findInstance;
    /**
     * Get component name from component type
     */
    private getComponentName;
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
export declare const vue3Adapter: Vue3Adapter;
//# sourceMappingURL=vue-adapter.d.ts.map