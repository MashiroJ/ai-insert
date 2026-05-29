import type { AgentTarget, SetupAgentId } from './types.js';
export declare const AGENT_TARGETS: readonly AgentTarget[];
export declare function getAgentTarget(id: SetupAgentId): AgentTarget;
export declare function resolveAgentTargets(project: string, requested: SetupAgentId | 'auto' | 'none'): AgentTarget[];
