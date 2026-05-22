/**
 * React framework adapter
 *
 * This adapter provides React-specific functionality through React DevTools.
 * Note: This is a placeholder implementation - full integration requires React DevTools hooks.
 */

import type {
  ComponentInfo,
  ComponentTreeNode,
  FrameworkAdapter,
  SourceHint,
  SourceLocation,
  PropValue,
  StateValue,
  DevToolsCallback,
} from './interfaces.js';

/**
 * React fiber node type (internal)
 */
interface ReactFiberNode {
  elementType?: { name?: string; [key: string]: unknown };
  memoizedProps?: Record<string, unknown>;
  memoizedState?: unknown;
  return?: ReactFiberNode;
  [key: string]: unknown;
}

/**
 * React adapter implementation
 */
export class ReactAdapter implements FrameworkAdapter {
  readonly name = 'react';
  readonly version?: string;

  private devToolsCleanup: (() => void) | null = null;

  constructor() {
    // Try to detect React version
    if (typeof window !== 'undefined') {
      const reactRoot = (window as unknown as { __REACT_ROOT__?: unknown }).__REACT_ROOT__;
      if (reactRoot) {
        this.version = '18'; // Default to 18
      }
    }
  }

  getComponentInfo(element: HTMLElement): ComponentInfo | null {
    const fiber = this.findFiber(element);

    if (!fiber?.elementType) {
      return null;
    }

    const name = this.getComponentName(fiber.elementType);

    return {
      name,
      displayName: name,
      instanceId: this.getFiberId(fiber),
    };
  }

  getComponentChain(element: HTMLElement): ComponentInfo[] {
    const chain: ComponentInfo[] = [];
    let fiber = this.findFiber(element);

    while (fiber) {
      if (fiber.elementType) {
        const name = this.getComponentName(fiber.elementType);
        chain.unshift({
          name,
          displayName: name,
          instanceId: this.getFiberId(fiber),
        });
      }

      fiber = fiber.return ?? null;
    }

    return chain;
  }

  getComponentTree(element: HTMLElement): ComponentTreeNode {
    const info = this.getComponentInfo(element) || {
      name: 'unknown',
    };

    const children: ComponentTreeNode[] = [];

    // Simplified - would need proper fiber traversal
    for (const child of Array.from(element.children)) {
      if (child instanceof HTMLElement) {
        children.push(this.getComponentTree(child));
      }
    }

    return {
      info,
      children,
      depth: this.getComponentChain(element).length,
    };
  }

  getSourceLocation(): SourceLocation | null {
    // React doesn't provide source location by default
    // This would require source maps or React DevTools integration
    return null;
  }

  getSourceHints(element: HTMLElement): SourceHint[] {
    const hints: SourceHint[] = [];

    // Check for React-specific attributes
    const reactRoot = element.closest('[data-reactroot]');
    if (reactRoot) {
      hints.push({
        kind: 'config-file',
        file: 'App.jsx', // Placeholder
        line: null,
        column: null,
        confidence: 0.5,
        reason: 'Element is within React root',
      });
    }

    return hints;
  }

  getComponentProps(element: HTMLElement): Record<string, PropValue> {
    const fiber = this.findFiber(element);

    if (!fiber || !fiber.memoizedProps) {
      return {};
    }

    return this.sanitizeProps(fiber.memoizedProps);
  }

  getComponentState(element: HTMLElement): Record<string, StateValue> | null {
    const fiber = this.findFiber(element);

    if (!fiber) {
      return null;
    }

    const state: Record<string, StateValue> = {};

    // Extract state from fiber (simplified)
    if (fiber.memoizedState) {
      // This is a simplified version - real implementation would traverse state
      state.memoized = this.sanitizeValue(fiber.memoizedState);
    }

    return state;
  }

  isAvailable(): boolean {
    // Check if React is available
    return typeof document !== 'undefined' &&
           (typeof (window as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown }).__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined' ||
            Array.from(document.querySelectorAll('*')).some((el) => {
              return '_reactRootContainer' in el || '_reactInternalFiber' in el;
            }));
  }

  installDevToolsHook(callback: DevToolsCallback): () => void {
    const hook = (window as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: { inject?: (arg: unknown) => void } }).__REACT_DEVTOOLS_GLOBAL_HOOK__;

    if (!hook || !hook.inject) {
      return () => {};
    }

    // Placeholder for actual React DevTools integration
    const cleanup = () => {
      // Cleanup logic
    };

    this.devToolsCleanup = cleanup;
    return cleanup;
  }

  /**
   * Find the React fiber node for an element
   */
  private findFiber(element: HTMLElement): ReactFiberNode | null {
    // Try internal React properties
    if ('_reactInternalFiber' in element) {
      return (element as unknown as { _reactInternalFiber: ReactFiberNode })._reactInternalFiber;
    }

    if ('_reactRootContainer' in element) {
      return (element as unknown as { _reactRootContainer: { _internalRoot?: { current?: ReactFiberNode } } })._reactRootContainer?._internalRoot?.current || null;
    }

    // Traverse up to find fiber
    let current: HTMLElement | null = element;
    while (current) {
      if ('_reactInternalFiber' in current) {
        return (current as unknown as { _reactInternalFiber: ReactFiberNode })._reactInternalFiber;
      }
      current = current.parentElement;
    }

    return null;
  }

  /**
   * Get component name from element type
   */
  private getComponentName(elementType: { name?: string; displayName?: string; [key: string]: unknown }): string {
    if (elementType.name) {
      return elementType.name;
    }

    if ('displayName' in elementType && typeof elementType.displayName === 'string') {
      return elementType.displayName;
    }

    return 'AnonymousComponent';
  }

  /**
   * Get a unique ID for a fiber node
   */
  private getFiberId(fiber: ReactFiberNode): string {
    return String((fiber as unknown as { _debugID?: number })._debugID || Math.random());
  }

  /**
   * Sanitize props for safe transmission
   */
  private sanitizeProps(props: Record<string, unknown>): Record<string, PropValue> {
    const sanitized: Record<string, PropValue> = {};

    for (const [key, value] of Object.entries(props)) {
      // Skip React internal props
      if (key.startsWith('__')) {
        continue;
      }

      sanitized[key] = this.sanitizeValue(value);
    }

    return sanitized;
  }

  /**
   * Sanitize a value for safe transmission
   */
  private sanitizeValue(value: unknown): PropValue {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((v) => this.sanitizeValue(v));
    }

    if (typeof value === 'object') {
      const obj: Record<string, PropValue> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        obj[k] = this.sanitizeValue(v);
      }
      return obj;
    }

    return String(value);
  }
}

/**
 * Singleton instance
 */
export const reactAdapter = new ReactAdapter();
