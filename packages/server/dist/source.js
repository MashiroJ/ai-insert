import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { isRecord } from './utils.js';
import { detectEditor } from './editors.js';
export async function readSelectionSource(selection, contextLines) {
    const root = selection.source.root;
    const file = selection.source.file;
    if (!root || !file)
        throw new Error('selection has no source file');
    const resolvedRoot = path.resolve(root);
    const resolvedFile = path.isAbsolute(file) ? path.resolve(file) : path.resolve(resolvedRoot, file);
    const rel = path.relative(resolvedRoot, resolvedFile);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error(`source file is outside root: ${file}`);
    }
    let raw;
    try {
        raw = await readFile(resolvedFile, 'utf8');
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`failed to read source file ${resolvedFile}: ${message}`);
    }
    const lines = raw.split(/\r?\n/);
    const requestedLine = selection.source.line ?? 1;
    const center = Math.min(Math.max(1, requestedLine), lines.length);
    const startLine = Math.max(1, center - contextLines);
    const endLine = Math.min(lines.length, center + contextLines);
    const content = lines
        .slice(startLine - 1, endLine)
        .map((line, index) => `${String(startLine + index).padStart(5, ' ')}  ${line}`)
        .join('\n');
    return {
        file: rel,
        root: resolvedRoot,
        startLine,
        endLine,
        totalLines: lines.length,
        content,
    };
}
export function openSource(value, projectRoot, requestedEditor) {
    if (!isRecord(value))
        return { ok: false, error: 'source object required' };
    const root = typeof value.root === 'string' ? value.root : projectRoot;
    const file = typeof value.file === 'string' ? value.file : '';
    if (!file)
        return { ok: false, error: 'source.file is required' };
    const resolvedRoot = path.resolve(root);
    const resolvedFile = path.isAbsolute(file) ? path.resolve(file) : path.resolve(resolvedRoot, file);
    const rel = path.relative(resolvedRoot, resolvedFile);
    if (rel.startsWith('..') || path.isAbsolute(rel))
        return { ok: false, error: `source file is outside root: ${file}` };
    if (!existsSync(resolvedFile))
        return { ok: false, error: `source file not found: ${resolvedFile}` };
    const line = typeof value.line === 'number' && Number.isFinite(value.line) && value.line > 0 ? Math.floor(value.line) : 1;
    const column = typeof value.column === 'number' && Number.isFinite(value.column) && value.column > 0 ? Math.floor(value.column) : 1;
    const editor = detectEditor(requestedEditor);
    const target = `${resolvedFile}:${line}:${column}`;
    const args = editor === 'open'
        ? ['-t', resolvedFile]
        : ['-g', target];
    try {
        const child = spawn(editor, args, {
            detached: true,
            stdio: 'ignore',
        });
        child.unref();
        return { ok: true, editor, command: editor, args, file: resolvedFile };
    }
    catch (err) {
        return { ok: false, editor, command: editor, args, file: resolvedFile, error: err instanceof Error ? err.message : String(err) };
    }
}
//# sourceMappingURL=source.js.map