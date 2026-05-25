export interface EnsureDaemonOptions {
    daemonUrl: string;
    project?: string;
    timeoutMs?: number;
}
export interface EnsureDaemonWarning {
    versionMismatch: true;
    cliVersion: string;
    daemonVersion: string;
    daemonUrl: string;
}
export interface EnsureDaemonResult {
    warnings?: EnsureDaemonWarning[];
}
export declare function ensureDaemon({ daemonUrl, project, timeoutMs }: EnsureDaemonOptions): Promise<EnsureDaemonResult>;
