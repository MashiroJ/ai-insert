// Compatibility shell - re-export from mcp/ directory
export * from './mcp/index.js';
export { getLatestFrontendRequest as latestFrontendRequest } from './mcp/wait.js';
export { compactFrontendRequestResult } from './mcp/compact.js';
export { resolveProjectRoot } from './mcp/project-root.js';
