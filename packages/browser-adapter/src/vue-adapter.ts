/**
 * Vue 3 framework adapter
 *
 * This adapter provides Vue-specific functionality through Vue's internal APIs.
 */

import type {
  ComponentInfo,
  ComponentTreeNode,
  FrameworkAdapter,
  SourceHint,
  SourceLocation,
  PropValue,
  StateValue,
} from './interfaces.js';

/**
 * Vue component instance type (internal)
 */
interface VueComponentInstance {
  uid: number;
  type: {
    name?: string;
    __file?: string;
    [key: string]: unknown;
  };
  props?: Record<string, unknown>;
  setupState?: Record<string, unknown>;
  ctx?: Record<string, unknown>;
  parent?: VueComponentInstance;
  [key: string]: unknown;
}

/**
 * Vue 3 adapter implementation
 */
export class Vue3Adapter implements FrameworkAdapter {
  readonly name = 'vue3';
  readonly version?: string;

  constructor() {
    // Try to detect Vue version
    if (typeof window !== 'undefined') {
      const vueApp = (window as unknown as { __VUE_APP__?: unknown }).__VUE_APP__;
      if (vueApp) {
        // Vue 3
        this.version = '3';
      }
    }
  }

  getComponentInfo(element: HTMLElement): ComponentInfo | null {
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

  getComponentChain(element: HTMLElement): ComponentInfo[] {
    const chain: ComponentInfo[] = [];
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

  getComponentTree(element: HTMLElement): ComponentTreeNode {
    const info = this.getComponentInfo(element) || {
      name: 'unknown',
    };

    const children: ComponentTreeNode[] = [];

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

  getSourceLocation(element: HTMLElement): SourceLocation | null {
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

  getSourceHints(element: HTMLElement): SourceHint[] {
    const hints: SourceHint[] = [];
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

  getComponentProps(element: HTMLElement): Record<string, PropValue> {
    const instance = this.findInstance(element);

    if (!instance || !instance.props) {
      return {};
    }

    return this.sanitizeProps(instance.props);
  }

  getComponentState(element: HTMLElement): Record<string, StateValue> | null {
    const instance = this.findInstance(element);

    if (!instance) {
      return null;
    }

    const state: Record<string, StateValue> = {};

    if (instance.setupState) {
      for (const [key, value] of Object.entries(instance.setupState)) {
        state[key] = this.sanitizeValue(value);
      }
    }

    return state;
  }

  isAvailable(): boolean {
    // Check if Vue is available
    return typeof document !== 'undefined' &&
           Array.from(document.querySelectorAll('*')).some((el) => {
               return '__vueParentComponent' in el;
             });
  }

  /**
   * Find the Vue component instance for an element
   */
  private findInstance(element: HTMLElement): VueComponentInstance | null {
    // Try __vueParentComponent first (Vue 3)
    if ('__vueParentComponent' in element) {
      return (element as unknown as { __vueParentComponent: VueComponentInstance }).__vueParentComponent;
    }

    // Try traversing up the tree
    let current: HTMLElement | null = element;
    while (current) {
      if ('__vueParentComponent' in current) {
        return (current as unknown as { __vueParentComponent: VueComponentInstance }).__vueParentComponent;
      }
      current = current.parentElement;
    }

    return null;
  }

  /**
   * Get component name from component type
   */
  private getComponentName(type: { name?: string; [key: string]: unknown }): string {
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
  private sanitizeProps(props: Record<string, unknown>): Record<string, PropValue> {
    const sanitized: Record<string, PropValue> = {};

    for (const [key, value] of Object.entries(props)) {
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
export const vue3Adapter = new Vue3Adapter();
