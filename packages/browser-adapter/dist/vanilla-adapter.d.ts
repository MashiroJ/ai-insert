/**
 * Vanilla JS adapter for pure DOM scenarios
 *
 * This adapter provides basic functionality when no framework is detected.
 * It works with plain HTML/CSS/JavaScript without any framework.
 */
import type { ComponentInfo, ComponentTreeNode, FrameworkAdapter, SourceHint, SourceLocation, PropValue, StateValue } from './interfaces.js';
/**
 * Vanilla JS framework adapter
 */
export declare class VanillaAdapter implements FrameworkAdapter {
    readonly name = "vanilla";
    getComponentInfo(element: HTMLElement): ComponentInfo | null;
    getComponentChain(element: HTMLElement): ComponentInfo[];
    getComponentTree(element: HTMLElement): ComponentTreeNode;
    getSourceLocation(element: HTMLElement): SourceLocation | null;
    getSourceHints(element: HTMLElement): SourceHint[];
    getComponentProps(element: HTMLElement): Record<string, PropValue>;
    getComponentState(): Record<string, StateValue> | null;
    isAvailable(): boolean;
}
/**
 * Singleton instance
 */
export declare const vanillaAdapter: VanillaAdapter;
//# sourceMappingURL=vanilla-adapter.d.ts.map