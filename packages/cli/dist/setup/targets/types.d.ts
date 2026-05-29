import type { SetupChange } from '../../setup.js';
export type SetupAgentId = 'claude' | 'cursor' | 'codex' | 'opencode';
export interface SetupAgentOptions {
    project: string;
    dryRun: boolean;
    hooks: boolean;
    mcp: boolean;
}
export interface SetupAgentResult {
    agent: SetupAgentId;
    detected: boolean;
    mcpConfigured: boolean;
    hooksConfigured: boolean;
    changes: SetupChange[];
    warnings: string[];
    nextSteps: string[];
}
export interface AgentTarget {
    readonly id: SetupAgentId;
    readonly displayName: string;
    detect(project: string): boolean;
    install(options: SetupAgentOptions): SetupAgentResult;
    printConfig(project: string): string;
}
