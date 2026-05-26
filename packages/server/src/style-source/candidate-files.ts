import { resolve, relative } from 'node:path';
import type { CandidateFile } from './types.js';
import type { UiInspectCssDebugTarget, UiInspectCssDebugPayload } from '@ui-inspect/protocol';

export function collectCandidateFiles(
  target: UiInspectCssDebugTarget,
  payload: UiInspectCssDebugPayload,
  projectRoot: string,
): CandidateFile[] {
  const paths = new Set<string>();
  const resolvedRoot = resolve(projectRoot);

  const addPath = (p: string | null | undefined) => {
    if (!p || typeof p !== 'string') return;
    const absolute = resolve(resolvedRoot, p);
    if (!isInsideProject(absolute, resolvedRoot)) return;
    paths.add(absolute);
  };

  addPath(target.selection.source?.file);
  addPath(target.selection.vue?.sourceFile);
  addPath(target.selection.component?.file);

  for (const hint of target.sourceHints ?? []) addPath(hint.file as string | null | undefined);
  for (const hint of payload.sourceHints ?? []) addPath(hint.file as string | null | undefined);

  const result: CandidateFile[] = [];
  for (const absolute of paths) {
    result.push({ absolute, relative: relative(projectRoot, absolute) });
  }

  return result.slice(0, 5);
}

function isInsideProject(absolute: string, projectRoot: string): boolean {
  const rel = relative(projectRoot, absolute);
  return !rel.startsWith('..');
}
