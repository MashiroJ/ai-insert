import { resolveProjectRoot } from '../project-root.js';

export async function startUiInspectHandler(args: unknown, daemonUrl: string): Promise<unknown> {
  const project = typeof args === 'object' && args !== null && 'project' in args
    ? (args as { project?: unknown }).project
    : undefined;
  const projectRoot = resolveProjectRoot(project);
  return { ok: true, projectRoot };
}
