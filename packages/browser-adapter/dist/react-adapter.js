/**
 * React framework adapter
 *
 * Provides React-specific functionality through React Fiber and DevTools.
 * Supports React 16.8+ (hooks) and React 18+.
 */
/**
 * Enhanced React adapter implementation
 */
export class ReactAdapter {
    constructor() {
        this.name = 'react';
        this.devToolsCleanup = null;
        this.renderer = null;
        this.detectReactVersion();
        this.attachToDevTools();
    }
    /**
     * Detect React version from global objects
     */
    detectReactVersion() {
        if (typeof window === 'undefined')
            return;
        // React 18+
        if (window.__REACT_ROOT__) {
            this.version = '18';
            return;
        }
        // React 17
        if (window.__REACT__) {
            this.version = '17';
            return;
        }
        // Try to detect from ReactDOM
        const ReactDOM = window.ReactDOM;
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
    attachToDevTools() {
        const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (!hook)
            return;
        // Store renderer reference for later use
        hook.inject = hook.inject || ((renderer) => {
            this.renderer = renderer;
        });
    }
    getComponentInfo(element) {
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
    getComponentChain(element) {
        const chain = [];
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
    getComponentTree(element) {
        const info = this.getComponentInfo(element) || {
            name: 'unknown',
        };
        const children = [];
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
    getSourceLocation(element) {
        const fiber = this.findFiber(element);
        if (!fiber)
            return null;
        const file = this.getSourceFileFromFiber(fiber);
        if (!file)
            return null;
        // Try to extract line number from source map
        // This would require integration with source maps
        return {
            file,
            line: null,
            column: null,
        };
    }
    getSourceHints(element) {
        const hints = [];
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
    getComponentProps(element) {
        const fiber = this.findFiber(element);
        if (!fiber) {
            return {};
        }
        // Use pendingProps (incoming props) as they are more current
        const props = fiber.pendingProps || fiber.memoizedProps;
        if (!props) {
            return {};
        }
        return this.sanitizeProps(props);
    }
    getComponentState(element) {
        const fiber = this.findFiber(element);
        if (!fiber) {
            return null;
        }
        // Extract hooks state
        const state = {};
        let stateNode = fiber.memoizedState;
        let hookIndex = 0;
        while (stateNode) {
            const hookKey = `hook_${hookIndex}`;
            if (typeof stateNode === 'object' && stateNode !== null) {
                // Try to extract hook state
                if ('memoizedState' in stateNode && 'next' in stateNode) {
                    state[hookKey] = this.sanitizeValue(stateNode.memoizedState);
                    stateNode = stateNode.next;
                }
                else {
                    break;
                }
            }
            else {
                state[hookKey] = this.sanitizeValue(stateNode);
                break;
            }
            hookIndex++;
            if (hookIndex > 100)
                break; // Safety limit
        }
        return Object.keys(state).length > 0 ? state : null;
    }
    isAvailable() {
        // Check if React DevTools hook is available
        const hasDevTools = typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined';
        // Check for React internal properties
        const hasReactInternals = Array.from(document.querySelectorAll('*')).some((el) => {
            return '_reactInternalFiber' in el || '_reactRootContainer' in el || '_reactFiber' in el;
        });
        return hasDevTools || hasReactInternals;
    }
    installDevToolsHook(callback) {
        const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (!hook?.emit) {
            return () => { };
        }
        // Subscribe to DevTools events
        const originalEmit = hook.emit;
        let attached = false;
        const wrappedEmit = (...args) => {
            try {
                if (attached) {
                    callback({ type: 'react-devtools', data: args });
                }
            }
            catch {
                // Ignore errors
            }
            // Call original emit
            if (typeof originalEmit === 'function') {
                return originalEmit(...args);
            }
        };
        if (hook.emit !== wrappedEmit) {
            hook.emit = wrappedEmit;
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
    findFiber(element) {
        // Try React 18+ fiber
        if ('__reactFiber' in element) {
            return element.__reactFiber?.current || null;
        }
        // Try legacy React fiber
        if ('_reactInternalFiber' in element) {
            return element._reactInternalFiber || null;
        }
        // Try React root container
        if ('_reactRootContainer' in element) {
            return element._reactRootContainer?._internalRoot?.current || null;
        }
        // Traverse up DOM tree to find fiber
        let current = element;
        while (current && current !== document.body) {
            if ('__reactFiber' in current) {
                return current.__reactFiber?.current || null;
            }
            if ('_reactInternalFiber' in current) {
                return current._reactInternalFiber || null;
            }
            current = current.parentElement;
        }
        return null;
    }
    /**
     * Get component name from element type
     */
    getComponentName(elementType) {
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
            const type = elementType;
            if (type.name)
                return type.name;
            if (type.displayName)
                return type.displayName;
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
    getDisplayName(elementType, fallbackName) {
        if (typeof elementType !== 'object' || elementType === null) {
            return fallbackName;
        }
        const type = elementType;
        return type.displayName ?? type.name ?? fallbackName;
    }
    /**
     * Get source file from fiber node
     */
    getSourceFileFromFiber(fiber) {
        // Try _debugSource
        const debugSource = fiber._debugSource;
        if (debugSource?.fileName) {
            return debugSource.fileName;
        }
        // Try elementType._source
        if (fiber.elementType && typeof fiber.elementType === 'object') {
            const source = fiber.elementType._source;
            if (source?.fileName) {
                return source.fileName;
            }
        }
        return undefined;
    }
    /**
     * Get a unique ID for a fiber node
     */
    getFiberId(fiber) {
        // Try renderer's getFiberID if available
        if (this.renderer?.getFiberID) {
            try {
                return this.renderer.getFiberID(fiber);
            }
            catch {
                // Fall through to fallback
            }
        }
        // Use _debugID if available
        if (fiber._debugID) {
            return String(fiber._debugID);
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
    sanitizeProps(props) {
        const sanitized = {};
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
    sanitizeValue(value) {
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
            const obj = {};
            for (const [k, v] of Object.entries(value)) {
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
 * Singleton instance
 */
export const reactAdapter = new ReactAdapter();
//# sourceMappingURL=react-adapter.js.map