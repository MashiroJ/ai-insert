/**
 * Format utilities
 */
/**
 * Get basename from path
 */
export declare function basename(path: string): string;
/**
 * Get relative path from root
 */
export declare function relativePath(path: string, root: string): string;
/**
 * Escape HTML entities
 */
export declare function escapeHtml(text: string): string;
/**
 * Clean and truncate text
 */
export declare function cleanText(text: string): string;
/**
 * Truncate text with ellipsis
 */
export declare function truncateText(text: string, maxLen: number): string;
/**
 * Format tag name for display
 */
export declare function formatTagName(tag: string): string;
/**
 * Format date for display
 */
export declare function formatDate(timestamp: number): string;
/**
 * Format duration for display
 */
export declare function formatDuration(ms: number): string;
//# sourceMappingURL=format.d.ts.map