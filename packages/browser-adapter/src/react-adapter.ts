/**
 * React framework adapter
 *
 * Provides React-specific functionality through React Fiber and DevTools.
 * Supports React 16.8+ (hooks) and React 18+.
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
 * React Fiber node internal structure
 */
interface ReactFiberNode {
  elementType?: ReactElementType;
  memoizedProps?: Record<string, unknown>;
  memoizedState?: ReactStateNode | null;
  return?: ReactFiberNode | null;
  child?: ReactFiberNode | null;
  sibling?: ReactFiberNode | null;
  stateNode?: unknown;
  key?: string | null;
  ref?: unknown;
  pendingProps?: Record<string, unknown>;
  _debugOwner?: ReactFiberNode | null;
  _debugID?: number;
  index?: number;
  [key: string]: unknown;
}

/**
 * React element type
 */
type ReactElementType =
  | string // DOM element
  | ReactFunctionComponent
  | ReactClassComponent
  | { name?: string; displayName?: string; [key: string]: unknown };

/**
 * React function component
 */
interface ReactFunctionComponent {
  name?: string;
  displayName?: string;
  length?: number;
  prototype?: unknown;
  (props: unknown): unknown;
}

/**
 * React class component
 */
interface ReactClassComponent {
  name?: string;
  displayName?: string;
  prototype?: {
    render?: unknown;
    [key: string]: unknown;
  };
  isReactComponent?: boolean;
  new (props: unknown): unknown;
}

/**
 * React state node (for hooks)
 */
type ReactStateNode =
  | null
  | undefined
  | unknown
  | { memoizedState: ReactStateNode; next: ReactStateNode | null; queue?: unknown };

/**
 * React renderer interface
 */
interface ReactRenderer {
  findFiberByHostInstance?: (element: HTMLElement) => ReactFiberNode | null;
  getFiberID?: (fiber: ReactFiberNode) => string;
}

/**
 * Enhanced React adapter implementation
 */
export class ReactAdapter implements FrameworkAdapter {
  readonly name = 'react';
  version?: string;

  private devToolsCleanup: (() => void) | null = null;
  private renderer: ReactRenderer | null = null;

  constructor() {
    this.detectReactVersion();
    this.attachToDevTools();
  }

  /**
   * Detect React version from global objects
   */
  private detectReactVersion(): void {
    if (typeof window === 'undefined') return;

    // React 18+
    if ((window as unknown as { __REACT_ROOT__?: unknown }).__REACT_ROOT__) {
      this.version = '18';
      return;
    }

    // React 17
    if ((window as unknown as { __REACT__?: unknown }).__REACT__) {
      this.version = '17';
      return;
    }

    // Try to detect from ReactDOM
    const ReactDOM = (window as unknown as { ReactDOM?: { version?: string } }).ReactDOM;
    if (ReactDOM?.version) {
      this.version = ReactDOM.version.split('.')[0];
      return;
    }

    // Check for React internal properties
    const hasReactFiber = Array.from(document.querySelectorAll('*')).some((el) => {
      return '_reactInternalFiber' in el || '_reactRootContainer' in el;
    });

    if (hasReactFiber) {
      this.version = '17'; // Default to 17 if we detect fiber
    }
  }

  /**
   * Attach to React DevTools if available
   */
  private attachToDevTools(): void {
    const hook = (window as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReactDevToolsHook }).__REACT_DEVTOOLS_GLOBAL_HOOK__;

    if (!hook) return;

    // Store renderer reference for later use
    hook.inject = hook.inject || ((renderer: ReactRenderer) => {
      this.renderer = renderer;
    });
  }

  getComponentInfo(element: HTMLElement): ComponentInfo | null {
    const fiber = this.findFiber(element);

    if (!fiber?.elementType) {
      return null;
    }

    const name = this.getComponentName(fiber.elementType);
    const file = this.getSourceFileFromFiber(fiber);

    return {
      name,
      displayName: this.getDisplayName(fiber.elementType, name),
      file,
      instanceId: this.getFiberId(fiber),
    };
  }

  getComponentChain(element: HTMLElement): ComponentInfo[] {
    const chain: ComponentInfo[] = [];
    let fiber = this.findFiber(element);

    while (fiber) {
      if (fiber.elementType && typeof fiber.elementType !== 'string') {
        const name = this.getComponentName(fiber.elementType);
        const file = this.getSourceFileFromFiber(fiber);

        chain.unshift({
          name,
          displayName: this.getDisplayName(fiber.elementType, name),
          file,
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
    const fiber = this.findFiber(element);

    // Traverse fiber children
    let childFiber = fiber?.child ?? null;
    while (childFiber) {
      if (childFiber.stateNode instanceof HTMLElement) {
        const childInfo = this.getComponentInfo(childFiber.stateNode);
        if (childInfo) {
          children.push({
            info: childInfo,
            children: [],
            depth: this.getComponentChain(childFiber.stateNode).length,
          });
        }
      }
      childFiber = childFiber.sibling ?? null;
    }

    return {
      info,
      children,
      depth: this.getComponentChain(element).length,
    };
  }

  getSourceLocation(element: HTMLElement): SourceLocation | null {
    const fiber = this.findFiber(element);
    if (!fiber) return null;

    const file = this.getSourceFileFromFiber(fiber);
    if (!file) return null;

    // Try to extract line number from source map
    // This would require integration with source maps
    return {
      file,
      line: null,
      column: null,
    };
  }

  getSourceHints(element: HTMLElement): SourceHint[] {
    const hints: SourceHint[] = [];

    // Check for React root
    const reactRoot = element.closest('[data-reactroot]');
    if (reactRoot) {
      hints.push({
        kind: 'config-file',
        file: 'App.jsx', // Would need actual resolution
        line: null,
        column: null,
        confidence: 0.5,
        reason: 'Element is within React root',
        metadata: {
          rootId: reactRoot.id || undefined,
        },
      });
    }

    // Get component file hint
    const fiber = this.findFiber(element);
    if (fiber) {
      const file = this.getSourceFileFromFiber(fiber);
      if (file) {
        hints.push({
          kind: 'component-file',
          file,
          line: null,
          column: null,
          confidence: 0.85,
          reason: 'Component source from fiber',
        });
      }
    }

    return hints;
  }

  getComponentProps(element: HTMLElement): Record<string, PropValue> {
    const fiber = this.findFiber(element);

    if (!fiber) {
      return {};
    }

    // Use pendingProps (incoming props) as they are more current
    const props = fiber.pendingProps || fiber.memoizedProps;
    if (!props) {
      return {};
    }

    return this.sanitizeProps(props as Record<string, unknown>);
  }

  getComponentState(element: HTMLElement): Record<string, StateValue> | null {
    const fiber = this.findFiber(element);

    if (!fiber) {
      return null;
    }

    // Extract hooks state
    const state: Record<string, StateValue> = {};
    let stateNode = fiber.memoizedState;
    let hookIndex = 0;

    while (stateNode) {
      const hookKey = `hook_${hookIndex}`;

      if (typeof stateNode === 'object' && stateNode !== null) {
        // Try to extract hook state
        if ('memoizedState' in stateNode && 'next' in stateNode) {
          state[hookKey] = this.sanitizeValue((stateNode as { memoizedState: unknown }).memoizedState);
          stateNode = (stateNode as { next: ReactStateNode | null }).next;
        } else {
          break;
        }
      } else {
        state[hookKey] = this.sanitizeValue(stateNode);
        break;
      }

      hookIndex++;
      if (hookIndex > 100) break; // Safety limit
    }

    return Object.keys(state).length > 0 ? state : null;
  }

  isAvailable(): boolean {
    // Check if React DevTools hook is available
    const hasDevTools = typeof (window as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown }).__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined';

    // Check for React internal properties
    const hasReactInternals = Array.from(document.querySelectorAll('*')).some((el) => {
      return '_reactInternalFiber' in el || '_reactRootContainer' in el || '_reactFiber' in el;
    });

    return hasDevTools || hasReactInternals;
  }

  installDevToolsHook(callback: DevToolsCallback): () => void {
    const hook = (window as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReactDevToolsHook }).__REACT_DEVTOOLS_GLOBAL_HOOK__;

    if (!hook?.emit) {
      return () => {};
    }

    // Subscribe to DevTools events
    const originalEmit = hook.emit;
    let attached = false;

    const wrappedEmit = (...args: unknown[]) => {
      try {
        if (attached) {
          callback({ type: 'react-devtools', data: args });
        }
      } catch {
        // Ignore errors
      }

      // Call original emit
      if (typeof originalEmit === 'function') {
        return (originalEmit as (...args: unknown[]) => unknown)(...args);
      }
    };

    if (hook.emit !== wrappedEmit) {
      hook.emit = wrappedEmit as typeof hook.emit;
      attached = true;
    }

    this.devToolsCleanup = () => {
      if (hook.emit === wrappedEmit) {
        hook.emit = originalEmit;
      }
      attached = false;
    };

    return this.devToolsCleanup;
  }

  /**
   * Find the React fiber node for an element
   */
  private findFiber(element: HTMLElement): ReactFiberNode | null {
    // Try React 18+ fiber
    if ('__reactFiber' in element) {
      return (element as unknown as { __reactFiber?: { current?: ReactFiberNode | null } }).__reactFiber?.current || null;
    }

    // Try legacy React fiber
    if ('_reactInternalFiber' in element) {
      return (element as unknown as { _reactInternalFiber?: ReactFiberNode })._reactInternalFiber || null;
    }

    // Try React root container
    if ('_reactRootContainer' in element) {
      return (element as unknown as { _reactRootContainer?: { _internalRoot?: { current?: ReactFiberNode | null } } })._reactRootContainer?._internalRoot?.current || null;
    }

    // Traverse up DOM tree to find fiber
    let current: HTMLElement | null = element;
    while (current && current !== document.body) {
      if ('__reactFiber' in current) {
        return (current as unknown as { __reactFiber?: { current?: ReactFiberNode | null } }).__reactFiber?.current || null;
      }
      if ('_reactInternalFiber' in current) {
        return (current as unknown as { _reactInternalFiber?: ReactFiberNode })._reactInternalFiber || null;
      }
      current = current.parentElement;
    }

    return null;
  }

  /**
   * Get component name from element type
   */
  private getComponentName(elementType: ReactElementType): string {
    // String (DOM element)
    if (typeof elementType === 'string') {
      return elementType;
    }

    // Function component
    if (typeof elementType === 'function') {
      return elementType.name || 'AnonymousComponent';
    }

    // Object component (forwardRef, memo, etc.)
    if (typeof elementType === 'object' && elementType !== null) {
      const type = elementType as { name?: string; displayName?: string; render?: unknown };

      if (type.name) return type.name;
      if (type.displayName) return type.displayName;

      // Handle forwardRef
      if ('render' in type && typeof type.render === 'function') {
        const renderFn = type.render;
        if ('name' in renderFn && typeof renderFn.name === 'string') {
          return renderFn.name;
        }
        if ('displayName' in renderFn && typeof renderFn.displayName === 'string') {
          return renderFn.displayName;
        }
      }
    }

    return 'AnonymousComponent';
  }

  /**
   * Get display name for component
   */
  private getDisplayName(elementType: ReactElementType, fallbackName: string): string {
    if (typeof elementType !== 'object' || elementType === null) {
      return fallbackName;
    }

    const type = elementType as { displayName?: string | undefined; name?: string | undefined };
    return type.displayName ?? type.name ?? fallbackName;
  }

  /**
   * Get source file from fiber node
   */
  private getSourceFileFromFiber(fiber: ReactFiberNode): string | undefined {
    // Try _debugSource
    const debugSource = (fiber as unknown as { _debugSource?: { fileName?: string } })._debugSource;
    if (debugSource?.fileName) {
      return debugSource.fileName;
    }

    // Try elementType._source
    if (fiber.elementType && typeof fiber.elementType === 'object') {
      const source = (fiber.elementType as { _source?: { fileName?: string } })._source;
      if (source?.fileName) {
        return source.fileName;
      }
    }

    return undefined;
  }

  /**
   * Get a unique ID for a fiber node
   */
  private getFiberId(fiber: ReactFiberNode): string {
    // Try renderer's getFiberID if available
    if (this.renderer?.getFiberID) {
      try {
        return this.renderer.getFiberID(fiber);
      } catch {
        // Fall through to fallback
      }
    }

    // Use _debugID if available
    if ((fiber as unknown as { _debugID?: number })._debugID) {
      return String((fiber as unknown as { _debugID: number })._debugID);
    }

    // Fallback: generate stable ID from fiber properties
    const elementType = fiber.elementType;
    if (elementType && typeof elementType === 'object' && 'name' in elementType) {
      return `${String(elementType.name)}_${fiber.index ?? 0}`;
    }

    return `fiber_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Sanitize props for safe transmission
   */
  private sanitizeProps(props: Record<string, unknown>): Record<string, PropValue> {
    const sanitized: Record<string, PropValue> = {};

    for (const [key, value] of Object.entries(props)) {
      // Skip React internal props
      if (key.startsWith('__') || key === 'ref' || key === 'key') {
        continue;
      }

      // Skip function props (can't be serialized)
      if (typeof value === 'function') {
        sanitized[key] = '[function]';
        continue;
      }

      // Skip element refs
      if (key === 'children') {
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
        // Skip React internal properties
        if (k.startsWith('_') || k === '$$typeof') {
          continue;
        }
        obj[k] = this.sanitizeValue(v);
      }
      return obj;
    }

    return String(value);
  }
}

/**
 * React DevTools hook interface
 */
interface ReactDevToolsHook {
  inject?: (renderer: ReactRenderer) => void;
  emit?: (...args: unknown[]) => unknown;
  listeners?: Set<(...args: unknown[]) => unknown>;
  [key: string]: unknown;
}

/**
 * Singleton instance
 */
export const reactAdapter = new ReactAdapter();
