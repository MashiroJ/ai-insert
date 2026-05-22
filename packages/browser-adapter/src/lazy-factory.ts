/**
 * Lazy framework adapter factory
 *
 * Loads framework adapters on-demand to reduce initial bundle size.
 */

import type {
  AdapterDetectionResult,
  AdapterFactoryOptions,
  FrameworkAdapter,
} from './interfaces.js';

/**
 * Simple lazy module loader (local implementation to avoid shared dependency)
 */
class LazyModuleLoader<T> {
  private loadFn: () => Promise<T>;
  private cache: T | null = null;
  private loading: Promise<T> | null = null;

  constructor(loadFn: () => Promise<T>) {
    this.loadFn = loadFn;
  }

  async load(): Promise<T> {
    if (this.cache !== null) {
      return this.cache;
    }

    if (this.loading !== null) {
      return this.loading;
    }

    this.loading = this.loadFn()
      .then((module) => {
        this.cache = module;
        this.loading = null;
        return module;
      })
      .catch((err) => {
        this.loading = null;
        throw err;
      });

    return this.loading;
  }

  isLoaded(): boolean {
    return this.cache !== null;
  }

  reset(): void {
    this.cache = null;
    this.loading = null;
  }

  getIfLoaded(): T | null {
    return this.cache;
  }
}

/**
 * Lazy adapter loader configuration
 */
interface LazyAdapterConfig {
  name: string;
  load: () => Promise<FrameworkAdapter>;
  priority?: number; // Higher priority adapters are checked first
}

/**
 * Default lazy adapter configurations
 */
const LAZY_ADAPTERS: LazyAdapterConfig[] = [
  {
    name: 'vue3',
    priority: 10,
    load: () => import('./vue-adapter.js').then((m) => m.vue3Adapter),
  },
  {
    name: 'react',
    priority: 9,
    load: () => import('./react-adapter.js').then((m) => m.reactAdapter),
  },
  {
    name: 'vanilla',
    priority: 1,
    load: () => import('./vanilla-adapter.js').then((m) => m.vanillaAdapter),
  },
];

/**
 * Lazy adapter cache
 */
const adapterCache = new Map<string, LazyModuleLoader<FrameworkAdapter>>();

/**
 * Get or create a lazy loader for an adapter
 */
function getAdapterLoader(config: LazyAdapterConfig): LazyModuleLoader<FrameworkAdapter> {
  let loader = adapterCache.get(config.name);

  if (!loader) {
    loader = new LazyModuleLoader(config.load);
    adapterCache.set(config.name, loader);
  }

  return loader;
}

/**
 * Detect the best adapter for the current page (lazy loading)
 *
 * Adapters are loaded on-demand during detection. Once loaded, they are cached.
 */
export async function detectAdapterLazy(
  options: AdapterFactoryOptions = {}
): Promise<AdapterDetectionResult> {
  const {
    preferredAdapter,
    allowFallback = true,
    customAdapters = [],
  } = options;

  const customAvailable = customAdapters.filter((adapter) => adapter.isAvailable());

  if (preferredAdapter) {
    const preferredCustom = customAdapters.find((adapter) => adapter.name === preferredAdapter);
    if (preferredCustom?.isAvailable()) {
      return {
        adapter: preferredCustom,
        confidence: 1,
        reason: `Preferred adapter '${preferredAdapter}' is available`,
      };
    }
  }

  const customFrameworkAdapter = customAvailable.find((adapter) => adapter.name !== 'vanilla');
  if (customFrameworkAdapter) {
    return {
      adapter: customFrameworkAdapter,
      confidence: 0.9,
      reason: `Custom framework '${customFrameworkAdapter.name}' detected`,
    };
  }

  // Sort adapters by priority (highest first)
  const sortedAdapters = [...LAZY_ADAPTERS].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  // If preferred adapter is specified, try to load it
  if (preferredAdapter) {
    const preferredConfig = sortedAdapters.find((a) => a.name === preferredAdapter);
    if (preferredConfig) {
      const loader = getAdapterLoader(preferredConfig);
      try {
        const adapter = await loader.load();
        if (adapter.isAvailable()) {
          return {
            adapter,
            confidence: 1,
            reason: `Preferred adapter '${preferredAdapter}' is available`,
          };
        }
      } catch (error) {
        console.warn(`[ui-inspect] Failed to load preferred adapter '${preferredAdapter}':`, error);
      }
    }
  }

  // Try to detect available adapters by priority
  for (const config of sortedAdapters) {
    const loader = getAdapterLoader(config);

    try {
      const adapter = await loader.load();

      if (adapter.isAvailable()) {
        // Skip vanilla adapter if better options exist
        if (config.name === 'vanilla') {
          continue;
        }

        return {
          adapter,
          confidence: 0.9,
          reason: `Framework '${config.name}' detected`,
        };
      }
    } catch (error) {
      console.warn(`[ui-inspect] Failed to load adapter '${config.name}':`, error);
    }
  }

  // Fall back to vanilla adapter
  if (allowFallback) {
    const customVanilla = customAvailable.find((adapter) => adapter.name === 'vanilla');
    if (customVanilla) {
      return {
        adapter: customVanilla,
        confidence: 0.5,
        reason: 'Using custom vanilla adapter',
      };
    }

    const vanillaLoader = getAdapterLoader(
      LAZY_ADAPTERS.find((a) => a.name === 'vanilla')!
    );
    try {
      const adapter = await vanillaLoader.load();
      return {
        adapter,
        confidence: 0.1,
        reason: 'No framework detected, falling back to vanilla adapter',
      };
    } catch (error) {
      console.warn('[ui-inspect] Failed to load vanilla adapter:', error);
    }
  }

  return {
    adapter: null,
    confidence: 0,
    reason: 'No framework adapter available',
  };
}

/**
 * Get the best adapter for the current page (lazy loading)
 */
export async function getAdapterLazy(
  options: AdapterFactoryOptions = {}
): Promise<FrameworkAdapter | null> {
  const result = await detectAdapterLazy(options);
  return result.adapter;
}

/**
 * Create an adapter with the given options (lazy loading)
 */
export async function createAdapterLazy(
  options: AdapterFactoryOptions = {}
): Promise<FrameworkAdapter | null> {
  return getAdapterLazy(options);
}

/**
 * Get adapter by name (lazy loading)
 */
export async function getAdapterByNameLazy(
  name: string
): Promise<FrameworkAdapter | null> {
  const config = LAZY_ADAPTERS.find((a) => a.name === name);

  if (!config) {
    return null;
  }

  const loader = getAdapterLoader(config);

  try {
    return await loader.load();
  } catch (error) {
    console.warn(`[ui-inspect] Failed to load adapter '${name}':`, error);
    return null;
  }
}

/**
 * Clear adapter cache (force reload on next access)
 */
export function clearAdapterCache(name?: string): void {
  if (name) {
    const loader = adapterCache.get(name);
    if (loader) {
      loader.reset();
    }
  } else {
    adapterCache.forEach((loader) => loader.reset());
    adapterCache.clear();
  }
}

/**
 * Get all currently loaded adapters (without loading new ones)
 */
export function getLoadedAdapters(): FrameworkAdapter[] {
  const loaded: FrameworkAdapter[] = [];

  adapterCache.forEach((loader, name) => {
    const adapter = loader.getIfLoaded();
    if (adapter) {
      loaded.push(adapter);
    }
  });

  return loaded;
}
