/**
 * Vue 3 framework adapter
 *
 * This adapter provides Vue-specific functionality through Vue's internal APIs.
 */
/**
 * Vue 3 adapter implementation
 */
export class Vue3Adapter {
    constructor() {
        this.name = 'vue3';
        // Try to detect Vue version
        if (typeof window !== 'undefined') {
            const vueApp = window.__VUE_APP__;
            if (vueApp) {
                // Vue 3
                this.version = '3';
            }
        }
    }
    getComponentInfo(element) {
        const instance = this.findInstance(element);
        if (!instance) {
            return null;
        }
        const name = this.getComponentName(instance.type);
        const file = instance.type.__file ?? undefined;
        return {
            name,
            displayName: name,
            file,
            instanceId: String(instance.uid),
        };
    }
    getComponentChain(element) {
        const chain = [];
        let instance = this.findInstance(element);
        while (instance) {
            const name = this.getComponentName(instance.type);
            const file = instance.type.__file ?? undefined;
            chain.unshift({
                name,
                displayName: name,
                file,
                instanceId: String(instance.uid),
            });
            instance = instance.parent ?? null;
        }
        return chain;
    }
    getComponentTree(element) {
        const info = this.getComponentInfo(element) || {
            name: 'unknown',
        };
        const children = [];
        // For Vue, we'd need to traverse component children, not just DOM children
        // This is a simplified version
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
    getSourceLocation(element) {
        const instance = this.findInstance(element);
        if (!instance || !instance.type.__file) {
            return null;
        }
        const file = instance.type.__file;
        // Try to get line number from stack trace or other sources
        return {
            file,
            line: null,
            column: null,
        };
    }
    getSourceHints(element) {
        const hints = [];
        const instance = this.findInstance(element);
        if (instance && instance.type.__file) {
            hints.push({
                kind: 'component-file',
                file: instance.type.__file,
                line: null,
                column: null,
                confidence: 0.9,
                reason: 'Vue component __file property',
            });
        }
        // Check for scoped styles
        const scopedAttr = element.getAttribute('data-v-');
        if (scopedAttr) {
            hints.push({
                kind: 'style-file',
                file: 'component', // Would need to resolve actual file
                line: null,
                column: null,
                confidence: 0.7,
                reason: 'Vue scoped style attribute',
            });
        }
        return hints;
    }
    getComponentProps(element) {
        const instance = this.findInstance(element);
        if (!instance || !instance.props) {
            return {};
        }
        return this.sanitizeProps(instance.props);
    }
    getComponentState(element) {
        const instance = this.findInstance(element);
        if (!instance) {
            return null;
        }
        const state = {};
        if (instance.setupState) {
            for (const [key, value] of Object.entries(instance.setupState)) {
                state[key] = this.sanitizeValue(value);
            }
        }
        return state;
    }
    isAvailable() {
        // Check if Vue is available
        return typeof document !== 'undefined' &&
            Array.from(document.querySelectorAll('*')).some((el) => {
                return '__vueParentComponent' in el;
            });
    }
    /**
     * Find the Vue component instance for an element
     */
    findInstance(element) {
        // Try __vueParentComponent first (Vue 3)
        if ('__vueParentComponent' in element) {
            return element.__vueParentComponent;
        }
        // Try traversing up the tree
        let current = element;
        while (current) {
            if ('__vueParentComponent' in current) {
                return current.__vueParentComponent;
            }
            current = current.parentElement;
        }
        return null;
    }
    /**
     * Get component name from component type
     */
    getComponentName(type) {
        if (type.name) {
            return type.name;
        }
        // Try to infer name from other properties
        if ('__name' in type && typeof type.__name === 'string') {
            return type.__name;
        }
        return 'AnonymousComponent';
    }
    /**
     * Sanitize props for safe transmission
     */
    sanitizeProps(props) {
        const sanitized = {};
        for (const [key, value] of Object.entries(props)) {
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
export const vue3Adapter = new Vue3Adapter();
//# sourceMappingURL=vue-adapter.js.map