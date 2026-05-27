export interface RunMcpOptions {
    daemonUrl: string;
}
export declare function runMcpStdio({ daemonUrl }: RunMcpOptions): Promise<void>;
export * from './types.js';
export * from './tool-defs.js';
export * from './project-root.js';
export * from './wait.js';
export * from './compact.js';
export * from './complete.js';
