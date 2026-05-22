/**
 * React framework adapter
 *
 * This adapter provides React-specific functionality through React DevTools.
 * Note: This is a placeholder implementation - full integration requires React DevTools hooks.
 */
/**
 * React adapter implementation
 */
export class ReactAdapter {
    constructor() {
        this.name = 'react';
        this.devToolsCleanup = null;
        // Try to detect React version
        if (typeof window !== 'undefined') {
            const reactRoot = window.__REACT_ROOT__;
            if (reactRoot) {
                this.version = '18'; // Default to 18
            }
        }
    }
    getComponentInfo(element) {
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
    getComponentChain(element) {
        const chain = [];
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
    getComponentTree(element) {
        const info = this.getComponentInfo(element) || {
            name: 'unknown',
        };
        const children = [];
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
    getSourceLocation() {
        // React doesn't provide source location by default
        // This would require source maps or React DevTools integration
        return null;
    }
    getSourceHints(element) {
        const hints = [];
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
    getComponentProps(element) {
        const fiber = this.findFiber(element);
        if (!fiber || !fiber.memoizedProps) {
            return {};
        }
        return this.sanitizeProps(fiber.memoizedProps);
    }
    getComponentState(element) {
        const fiber = this.findFiber(element);
        if (!fiber) {
            return null;
        }
        const state = {};
        // Extract state from fiber (simplified)
        if (fiber.memoizedState) {
            // This is a simplified version - real implementation would traverse state
            state.memoized = this.sanitizeValue(fiber.memoizedState);
        }
        return state;
    }
    isAvailable() {
        // Check if React is available
        return typeof document !== 'undefined' &&
            (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined' ||
                Array.from(document.querySelectorAll('*')).some((el) => {
                    return '_reactRootContainer' in el || '_reactInternalFiber' in el;
                }));
    }
    installDevToolsHook(callback) {
        const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (!hook || !hook.inject) {
            return () => { };
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
    findFiber(element) {
        // Try internal React properties
        if ('_reactInternalFiber' in element) {
            return element._reactInternalFiber;
        }
        if ('_reactRootContainer' in element) {
            return element._reactRootContainer?._internalRoot?.current || null;
        }
        // Traverse up to find fiber
        let current = element;
        while (current) {
            if ('_reactInternalFiber' in current) {
                return current._reactInternalFiber;
            }
            current = current.parentElement;
        }
        return null;
    }
    /**
     * Get component name from element type
     */
    getComponentName(elementType) {
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
    getFiberId(fiber) {
        return String(fiber._debugID || Math.random());
    }
    /**
     * Sanitize props for safe transmission
     */
    sanitizeProps(props) {
        const sanitized = {};
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