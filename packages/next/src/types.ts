/**
 * Type definitions for ui-inspect Next.js integration.
 */

export interface UiInspectNextOptions {
  /**
   * Daemon URL used by the browser client.
   * @default "http://127.0.0.1:17321"
   */
  daemonUrl?: string;

  /**
   * Project root path.
   * @default process.cwd()
   */
  root?: string;

  /**
   * URL for the Diana sprite served by a Next route.
   * @default "/api/ui-inspect/diana"
   */
  dianaSpriteUrl?: string;

  /**
   * Enable ui-inspect script injection.
   * @default true
   */
  enabled?: boolean;
}

export type UiInspectScriptProps = UiInspectNextOptions;
