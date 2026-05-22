import { spawnSync } from 'node:child_process';

export function detectEditor(requestedEditor?: string): string {
  if (requestedEditor && isKnownEditorCommand(requestedEditor) && commandExists(requestedEditor)) return requestedEditor;
  const preferred = process.env.UI_INSPECT_EDITOR;
  if (preferred && commandExists(preferred)) return preferred;
  for (const command of ['cursor', 'code', 'webstorm', 'windsurf', 'zed', 'trae']) {
    if (commandExists(command)) return command;
  }
  return process.platform === 'darwin' ? 'open' : 'code';
}

export function detectEditors(): Array<{ id: string; label: string; available: boolean; fallback?: boolean }> {
  const editors: Array<{ id: string; label: string; available: boolean; fallback?: boolean }> = [
    { id: 'cursor', label: 'Cursor' },
    { id: 'code', label: 'VS Code' },
    { id: 'webstorm', label: 'WebStorm' },
    { id: 'windsurf', label: 'Windsurf' },
    { id: 'zed', label: 'Zed' },
    { id: 'trae', label: 'Trae' },
  ].map((editor) => ({ ...editor, available: commandExists(editor.id) }));
  if (process.platform === 'darwin') editors.push({ id: 'open', label: '系统默认', available: true, fallback: true });
  return editors;
}

function isKnownEditorCommand(command: string): boolean {
  return ['cursor', 'code', 'webstorm', 'windsurf', 'zed', 'trae', 'open'].includes(command);
}

export function commandExists(command: string): boolean {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}
