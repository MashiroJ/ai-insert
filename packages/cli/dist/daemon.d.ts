export interface EnsureDaemonOptions {
    daemonUrl: string;
    project?: string;
    timeoutMs?: number;
}
export interface EnsureWatcherOptions {
    daemonUrl: string;
    project?: string;
    agent?: string;
}
export declare function ensureDaemon({ daemonUrl, project, timeoutMs }: EnsureDaemonOptions): Promise<void>;
export declare function startWatcher({ daemonUrl, project, agent }: EnsureWatcherOptions): void;
