// Summary generation helpers

export function summarizeSelection(selection: any): string {
  if (!selection) return '';
  
  const parts = [];
  if (selection.framework) parts.push(selection.framework);
  if (selection.dom?.tagName) parts.push(selection.dom.tagName);
  if (selection.dom?.className) {
    const classes = selection.dom.className.split(/\s+/).filter(Boolean);
    if (classes.length > 0) parts.push(`.${classes[0]}`);
  }
  if (selection.source?.file) {
    const file = selection.source.file.split('/').pop();
    parts.push(file);
    if (selection.source.line) parts.push(`:${selection.source.line}`);
  }
  
  return parts.join(' • ');
}

export function summarizeTargets(targets: any[]): string {
  if (!targets || targets.length === 0) return '';
  
  if (targets.length === 1) {
    const t = targets[0];
    const tag = t.selectedElement?.tagName;
    const cls = t.selectedElement?.className?.split(/\s+/)?.[0];
    return cls ? `${tag}.${cls}` : tag;
  }
  
  return `${targets.length} targets`;
}

export function summarizeCssDebug(cssDebug: any): string {
  if (!cssDebug) return '';
  
  const targets = cssDebug.targets || [];
  const count = targets.length;
  
  if (count === 0) return '';
  
  // Count interaction types
  const interactions = {
    move: 0,
    resize: 0,
    font: 0,
  };
  
  for (const t of targets) {
    if (t.primaryInteraction?.type === 'move') interactions.move++;
    if (t.primaryInteraction?.type === 'resize') interactions.resize++;
    if (t.changedStyles) {
      for (const prop of Object.keys(t.changedStyles)) {
        if (prop.includes('font') || prop.includes('text')) interactions.font++;
      }
    }
  }
  
  const parts = [];
  if (interactions.move > 0) parts.push(`${interactions.move} moved`);
  if (interactions.resize > 0) parts.push(`${interactions.resize} resized`);
  if (interactions.font > 0) parts.push(`${interactions.font} text changes`);
  
  if (parts.length === 0) return `${count} elements`;
  return parts.join(', ');
}

export function summarizeDiagnostics(diagnostics: any[]): string {
  if (!diagnostics || diagnostics.length === 0) return '';
  
  const byLevel = {
    error: 0,
    warning: 0,
    info: 0,
  };
  
  for (const d of diagnostics) {
    const level = d.level || 'info';
    if (level in byLevel) byLevel[level as keyof typeof byLevel]++;
  }
  
  const parts = [];
  if (byLevel.error > 0) parts.push(`${byLevel.error} errors`);
  if (byLevel.warning > 0) parts.push(`${byLevel.warning} warnings`);
  if (byLevel.info > 0) parts.push(`${byLevel.info} info`);
  
  return parts.join(', ');
}
