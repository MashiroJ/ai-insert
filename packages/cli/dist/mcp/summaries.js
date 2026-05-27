// Summary generation helpers
export function summarizeSelection(selection) {
    if (!selection)
        return '';
    const parts = [];
    if (selection.framework)
        parts.push(selection.framework);
    if (selection.dom?.tagName)
        parts.push(selection.dom.tagName);
    if (selection.dom?.className) {
        const classes = selection.dom.className.split(/\s+/).filter(Boolean);
        if (classes.length > 0)
            parts.push(`.${classes[0]}`);
    }
    if (selection.source?.file) {
        const file = selection.source.file.split('/').pop();
        parts.push(file);
        if (selection.source.line)
            parts.push(`:${selection.source.line}`);
    }
    return parts.join(' • ');
}
export function summarizeTargets(targets) {
    if (!targets || targets.length === 0)
        return '';
    if (targets.length === 1) {
        const t = targets[0];
        const tag = t.selection?.dom?.tagName;
        const cls = t.selection?.dom?.className?.split(/\s+/)?.[0];
        return cls ? `${tag}.${cls}` : tag;
    }
    return `${targets.length} targets`;
}
export function summarizeDiagnostics(diagnostics) {
    if (!diagnostics || diagnostics.length === 0)
        return '';
    const byLevel = {
        error: 0,
        warning: 0,
        info: 0,
    };
    for (const d of diagnostics) {
        const level = d.level || 'info';
        if (level in byLevel)
            byLevel[level]++;
    }
    const parts = [];
    if (byLevel.error > 0)
        parts.push(`${byLevel.error} errors`);
    if (byLevel.warning > 0)
        parts.push(`${byLevel.warning} warnings`);
    if (byLevel.info > 0)
        parts.push(`${byLevel.info} info`);
    return parts.join(', ');
}
//# sourceMappingURL=summaries.js.map