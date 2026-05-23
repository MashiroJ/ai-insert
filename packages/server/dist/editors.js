import { spawnSync } from 'node:child_process';
export function detectEditor(requestedEditor) {
    if (requestedEditor && isKnownEditorCommand(requestedEditor) && (isSystemDefaultEditor(requestedEditor) || commandExists(requestedEditor))) {
        return requestedEditor;
    }
    const preferred = process.env.UI_INSPECT_EDITOR;
    if (preferred && (isSystemDefaultEditor(preferred) || commandExists(preferred)))
        return preferred;
    for (const command of ['cursor', 'code', 'webstorm', 'windsurf', 'zed', 'trae']) {
        if (commandExists(command))
            return command;
    }
    if (process.platform === 'darwin')
        return 'open';
    if (process.platform === 'win32')
        return 'start';
    return commandExists('xdg-open') ? 'xdg-open' : 'code';
}
export function detectEditors() {
    const editors = [
        { id: 'cursor', label: 'Cursor' },
        { id: 'code', label: 'VS Code' },
        { id: 'webstorm', label: 'WebStorm' },
        { id: 'windsurf', label: 'Windsurf' },
        { id: 'zed', label: 'Zed' },
        { id: 'trae', label: 'Trae' },
    ].map((editor) => ({ ...editor, available: commandExists(editor.id) }));
    if (process.platform === 'darwin')
        editors.push({ id: 'open', label: '系统默认', available: true, fallback: true });
    else if (process.platform === 'win32')
        editors.push({ id: 'start', label: '系统默认', available: true, fallback: true });
    else if (commandExists('xdg-open'))
        editors.push({ id: 'xdg-open', label: '系统默认', available: true, fallback: true });
    return editors;
}
function isKnownEditorCommand(command) {
    return ['cursor', 'code', 'webstorm', 'windsurf', 'zed', 'trae', 'open', 'start', 'xdg-open'].includes(command);
}
function isSystemDefaultEditor(command) {
    return command === 'open' || command === 'start' || command === 'xdg-open';
}
export function commandExists(command) {
    const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], {
        stdio: 'ignore',
        shell: process.platform === 'win32',
    });
    return result.status === 0;
}
//# sourceMappingURL=editors.js.map