/**
 * @ui-inspect/browser-ui
 *
 * Browser UI components for ui-inspect
 * Works with any build tool (Vite, Webpack, etc.)
 */
// Export Diana component
export * from './diana/index.js';
// Export panels
export * from './panels/index.js';
// Export styles
export * from './styles/index.js';
// Export utilities
export * from './utils/format.js';
// Export client source generator (shared runtime for build-tool plugins)
export { clientSource } from './client-source.js';
// Export Diana asset path resolver
export { getDianaAssetPath } from './diana-asset.js';
//# sourceMappingURL=index.js.map