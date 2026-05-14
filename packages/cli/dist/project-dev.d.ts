export interface EnsureProjectDevServerOptions {
    project: string;
    openBrowser?: boolean;
    timeoutMs?: number;
}
export interface EnsureProjectDevServerResult {
    ok: boolean;
    running: boolean;
    started: boolean;
    opened: boolean;
    url: string | null;
    command: string | null;
    pid: number | null;
    warnings: string[];
}
export declare function ensureProjectDevServer({ project, openBrowser, timeoutMs, }: EnsureProjectDevServerOptions): Promise<EnsureProjectDevServerResult>;
