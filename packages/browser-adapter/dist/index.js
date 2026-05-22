/**
 * @ui-inspect/browser-adapter
 *
 * Multi-framework browser adapter layer for ui-inspect
 */
// Export interfaces
export * from './interfaces.js';
// Export adapters
export { vanillaAdapter, VanillaAdapter } from './vanilla-adapter.js';
export { vue3Adapter, Vue3Adapter } from './vue-adapter.js';
export { reactAdapter, ReactAdapter } from './react-adapter.js';
// Export factory
export * from './factory.js';
// Export lazy factory (for on-demand loading)
export * from './lazy-factory.js';
// Export cache utilities
export * from './cache.js';
//# sourceMappingURL=index.js.map