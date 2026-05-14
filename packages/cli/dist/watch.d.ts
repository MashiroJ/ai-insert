export interface RunWatchOptions {
    daemonUrl?: string;
    project?: string;
    agent?: string;
    intervalMs?: number;
}
export declare function runWatch(options?: RunWatchOptions): Promise<void>;
