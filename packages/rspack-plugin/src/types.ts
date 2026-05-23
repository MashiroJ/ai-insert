/**
 * Type definitions for ui-inspect Rspack plugin
 */

export interface UiInspectPluginOptions {
  /**
   * Daemon URL for SSE connection
   * @default "http://127.0.0.1:17321"
   */
  daemonUrl?: string;

  /**
   * Project root path
   * @default process.cwd()
   */
  root?: string;

  /**
   * Whether to enable the plugin
   * @default true
   */
  enabled?: boolean;
}
