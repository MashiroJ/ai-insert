/**
 * Format utilities
 */

/**
 * Get basename from path
 */
export function basename(path: string): string {
  return path.split('/').pop() || path;
}

/**
 * Get relative path from root
 */
export function relativePath(path: string, root: string): string {
  if (path.startsWith(root)) {
    return path.slice(root.length).replace(/^\//, '');
  }
  return path;
}

/**
 * Escape HTML entities
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Clean and truncate text
 */
export function cleanText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

/**
 * Format tag name for display
 */
export function formatTagName(tag: string): string {
  return tag.toUpperCase();
}

/**
 * Format date for display
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}
