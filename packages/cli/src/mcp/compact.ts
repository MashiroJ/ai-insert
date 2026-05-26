// Compact response formatting for MCP hosts

export function compactFrontendRequestResult(result: any): any {
  if (!result || !result.ok) {
    return result;
  }

  const { message, session, source } = result;

  return {
    ok: true,
    requestId: message?.id,
    contextSummary: message?.context ? summarizeContext(message.context) : undefined,
    targetsSummary: message?.targets ? summarizeTargets(message.targets) : undefined,
    cssDebugSummary: message?.cssDebug ? summarizeCssDebug(message.cssDebug) : undefined,
    diagnosticsSummary: message?.diagnostics ? summarizeDiagnostics(message.diagnostics) : undefined,
    session: session ? summarizeSession(session) : undefined,
    nextCursor: {
      afterRequestId: message?.id,
    },
  };
}

function summarizeContext(context: any): string {
  if (!context) return '';
  const parts = [];
  if (context.framework) parts.push(context.framework);
  if (context.component) parts.push(context.component);
  if (context.selector) parts.push(context.selector);
  return parts.join(' • ');
}

function summarizeTargets(targets: any[]): string {
  if (!targets || targets.length === 0) return '';
  const count = targets.length;
  const first = targets[0];
  const tag = first?.selectedElement?.tagName;
  const cls = first?.selectedElement?.className?.split?.(/\s+/)?.[0];
  
  if (count === 1) {
    return cls ? `.${cls}` : tag;
  }
  return `${count} targets`;
}

function summarizeCssDebug(cssDebug: any): string {
  if (!cssDebug) return '';
  const targets = cssDebug.targets || [];
  const count = targets.length;
  const hasTransform = targets.some((t: any) => 
    t.primaryInteraction?.type === 'move' || t.changedStyles?.transform
  );
  const hasResize = targets.some((t: any) => 
    t.primaryInteraction?.type === 'resize'
  );
  
  const actions = [];
  if (hasTransform) actions.push('moved');
  if (hasResize) actions.push('resized');
  
  if (actions.length === 0) return `${count} elements`;
  return `${count} ${actions.join(', ')}`;
}

function summarizeDiagnostics(diagnostics: any): string {
  if (!diagnostics || diagnostics.length === 0) return '';
  return `${diagnostics.length} issues`;
}

function summarizeSession(session: any): string {
  if (!session) return '';
  return session.id || '';
}

export function compactSelection(selection: any): any {
  if (!selection) return selection;
  
  return {
    id: selection.id,
    url: selection.url,
    framework: selection.framework,
    selector: selection.dom?.selector,
    tagName: selection.dom?.tagName,
    className: selection.dom?.className,
    file: selection.source?.file,
    line: selection.source?.line,
  };
}

export function compactCssDebug(cssDebug: any): any {
  if (!cssDebug) return cssDebug;
  
  return {
    targets: cssDebug.targets?.map((t: any) => ({
      id: t.id,
      selector: t.selectedElement?.selector,
      changedStyles: Object.keys(t.changedStyles || {}),
      layoutHints: t.layoutHints?.map((h: any) => h.suggestedProperty),
    })),
  };
}
