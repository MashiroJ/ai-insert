import type { SetupChange } from '../../setup.js';
import type { SetupAgentId, SetupAgentResult } from './types.js';
export declare const UI_INSPECT_MCP: {
    command: string;
    args: string[];
};
export declare function createAgentResult(agent: SetupAgentId, detected: boolean): SetupAgentResult;
export declare function mergeJsonFile(file: string, dryRun: boolean, mutate: (json: Record<string, any>) => void, changes: SetupChange[], description: string): void;
export declare function readJsonFile(file: string): Record<string, any>;
export declare function appendTomlBlock(file: string, dryRun: boolean, marker: string, block: string, changes: SetupChange[], description: string): void;
export declare function ensureHookScript(project: string, dryRun: boolean, changes: SetupChange[]): string;
export declare function commandExists(command: string): boolean;
export declare function isRecord(value: unknown): value is Record<string, any>;
export declare function jsonString(value: string): string;
