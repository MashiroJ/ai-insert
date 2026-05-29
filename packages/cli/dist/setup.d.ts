import { type EnsureProjectIntegrationResult } from './project-setup.js';
import type { SetupAgentId, SetupAgentResult } from './setup/targets/types.js';
export type SetupTarget = 'all' | 'agent' | 'project';
export type SetupAgent = 'auto' | SetupAgentId | 'none';
export interface SetupOptions {
    project: string;
    target?: SetupTarget;
    agent?: SetupAgent;
    dryRun?: boolean;
    hooks?: boolean;
    mcp?: boolean;
}
export interface SetupChange {
    file: string;
    action: 'created' | 'updated' | 'skipped' | 'planned';
    description: string;
}
export interface SetupResult {
    project: string;
    dryRun: boolean;
    target: SetupTarget;
    projectIntegration: EnsureProjectIntegrationResult | null;
    agents: SetupAgentResult[];
    warnings: string[];
    nextSteps: string[];
}
export declare function setupUiInspect(options: SetupOptions): SetupResult;
