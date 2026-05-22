/**
 * Integration of cache utilities into browser-adapter
 *
 * Adds caching layer to framework adapters for better performance.
 */

import type { DevToolsCallback, FrameworkAdapter } from './interfaces.js';

/**
 * Cached wrapper for framework adapters
 */
export class CachedFrameworkAdapter implements FrameworkAdapter {
  readonly name: string;
  version?: string;
  private componentInfoCache = new WeakMap<HTMLElement, ReturnType<FrameworkAdapter['getComponentInfo']>>();
  private componentChainCache = new WeakMap<HTMLElement, ReturnType<FrameworkAdapter['getComponentChain']>>();
  private componentTreeCache = new WeakMap<HTMLElement, ReturnType<FrameworkAdapter['getComponentTree']>>();
  private sourceLocationCache = new WeakMap<HTMLElement, ReturnType<FrameworkAdapter['getSourceLocation']>>();
  private sourceHintsCache = new WeakMap<HTMLElement, ReturnType<FrameworkAdapter['getSourceHints']>>();

  constructor(private baseAdapter: FrameworkAdapter) {
    this.name = baseAdapter.name;
    this.version = baseAdapter.version;
  }

  getComponentInfo(element: HTMLElement) {
    return this.getCached(this.componentInfoCache, element, () => this.baseAdapter.getComponentInfo(element));
  }

  getComponentChain(element: HTMLElement) {
    return this.getCached(this.componentChainCache, element, () => this.baseAdapter.getComponentChain(element));
  }

  getComponentTree(element: HTMLElement) {
    return this.getCached(this.componentTreeCache, element, () => this.baseAdapter.getComponentTree(element));
  }

  getSourceLocation(element: HTMLElement) {
    return this.getCached(this.sourceLocationCache, element, () => this.baseAdapter.getSourceLocation(element));
  }

  getSourceHints(element: HTMLElement) {
    return this.getCached(this.sourceHintsCache, element, () => this.baseAdapter.getSourceHints(element));
  }

  getComponentProps(element: HTMLElement) {
    return this.baseAdapter.getComponentProps(element);
  }

  getComponentState(element: HTMLElement) {
    return this.baseAdapter.getComponentState(element);
  }

  isAvailable(): boolean {
    return this.baseAdapter.isAvailable();
  }

  installDevToolsHook?(callback: DevToolsCallback): () => void {
    const cleanup = this.baseAdapter.installDevToolsHook?.(callback);
    return cleanup || (() => {});
  }

  /**
   * Clear any cached data
   */
  clearCache(): void {
    this.componentInfoCache = new WeakMap();
    this.componentChainCache = new WeakMap();
    this.componentTreeCache = new WeakMap();
    this.sourceLocationCache = new WeakMap();
    this.sourceHintsCache = new WeakMap();
  }

  private getCached<T>(cache: WeakMap<HTMLElement, T>, element: HTMLElement, compute: () => T): T {
    if (cache.has(element)) {
      return cache.get(element)!;
    }

    const value = compute();
    cache.set(element, value);
    return value;
  }
}

/**
 * Wrap an adapter with caching layer
 */
export function withCaching(adapter: FrameworkAdapter): FrameworkAdapter {
  return new CachedFrameworkAdapter(adapter);
}
