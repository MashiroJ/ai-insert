import { resolveProjectRoot } from '../project-root.js';
export async function startUiInspectHandler(args, daemonUrl) {
    const project = typeof args === 'object' && args !== null && 'project' in args
        ? args.project
        : undefined;
    const projectRoot = resolveProjectRoot(project);
    return { ok: true, projectRoot };
}
//# sourceMappingURL=start.js.map