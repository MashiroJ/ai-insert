import type { AgentTarget, SetupAgentId } from './types.js';
import { claudeTarget } from './claude.js';
import { codexTarget } from './codex.js';
import { cursorTarget } from './cursor.js';
import { opencodeTarget } from './opencode.js';

export const AGENT_TARGETS: readonly AgentTarget[] = Object.freeze([
  claudeTarget,
  cursorTarget,
  codexTarget,
  opencodeTarget,
]);

export function getAgentTarget(id: SetupAgentId): AgentTarget {
  const target = AGENT_TARGETS.find((item) => item.id === id);
  if (!target) throw new Error(`Unknown setup agent: ${id}`);
  return target;
}

export function resolveAgentTargets(project: string, requested: SetupAgentId | 'auto' | 'none'): AgentTarget[] {
  if (requested === 'none') return [];
  if (requested !== 'auto') return [getAgentTarget(requested)];
  const detected = AGENT_TARGETS.filter((target) => target.detect(project));
  return detected.length > 0 ? detected : [claudeTarget, cursorTarget];
}
