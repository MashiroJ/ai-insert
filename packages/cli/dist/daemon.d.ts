export interface EnsureDaemonOptions {
    daemonUrl: string;
    project?: string;
    timeoutMs?: number;
}
export declare function ensureDaemon({ daemonUrl, project, timeoutMs }: EnsureDaemonOptions): Promise<void>;
