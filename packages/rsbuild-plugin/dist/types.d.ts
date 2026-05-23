/**
 * Type definitions for ui-inspect Rsbuild plugin.
 */
export interface UiInspectPluginOptions {
    /**
     * Daemon URL for SSE connection.
     * @default "http://127.0.0.1:17321"
     */
    daemonUrl?: string;
    /**
     * Project root path.
     * @default Rsbuild source/root config or process.cwd()
     */
    root?: string;
    /**
     * Enable ui-inspect injection.
     * @default true
     */
    enabled?: boolean;
}
//# sourceMappingURL=types.d.ts.map