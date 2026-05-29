import { claudeTarget } from './claude.js';
import { codexTarget } from './codex.js';
import { cursorTarget } from './cursor.js';
import { opencodeTarget } from './opencode.js';
export const AGENT_TARGETS = Object.freeze([
    claudeTarget,
    cursorTarget,
    codexTarget,
    opencodeTarget,
]);
export function getAgentTarget(id) {
    const target = AGENT_TARGETS.find((item) => item.id === id);
    if (!target)
        throw new Error(`Unknown setup agent: ${id}`);
    return target;
}
export function resolveAgentTargets(project, requested) {
    if (requested === 'none')
        return [];
    if (requested !== 'auto')
        return [getAgentTarget(requested)];
    const detected = AGENT_TARGETS.filter((target) => target.detect(project));
    return detected.length > 0 ? detected : [claudeTarget, cursorTarget];
}
//# sourceMappingURL=registry.js.map