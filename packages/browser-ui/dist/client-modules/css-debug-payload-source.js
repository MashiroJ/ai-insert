// Generated browser client source fragment for CSS Debug.
export const cssDebugPayloadClientSource = `
  function cssDebugGroupScaleForTarget(target) {
    var pi = target.primaryInteraction;
    if (pi && pi.type === 'group-scale' && pi.groupScale) return pi.groupScale;
    for (var i = (target.interactions || []).length - 1; i >= 0; i--) {
      var ia = target.interactions[i];
      if (ia.type === 'group-scale' && ia.groupScale) return ia.groupScale;
    }
    return undefined;
  }

  function makeCssDebugPayload(instruction) {
    if (!cssDebugSession) return null;
    const changedTargets = [];
    for (const target of cssDebugSession.targets.values()) {
      const previewStyles = target.previewStyles && Object.keys(target.previewStyles).length
        ? { ...cssDebugComputedStyles(target.element), ...target.previewStyles }
        : {};
      const changedStyles = cssDebugChangedStyles(target.originalStyles, previewStyles, target.activeProperties);
      const hasInteraction = target.primaryInteraction && (target.primaryInteraction.type === 'reorder' || target.primaryInteraction.type === 'group-scale');
      if (Object.keys(changedStyles).length === 0 && !hasInteraction) continue;
      const computedEffects = cssDebugComputedEffects(target.originalStyles, previewStyles, target.activeProperties);
      const groupScaleInfo = cssDebugGroupScaleForTarget(target);
      changedTargets.push({
        id: target.id,
        selection: target.selection,
        selectedElement: target.selection.dom,
        originalStyles: target.originalStyles,
        originalInlineStyles: target.originalInlineStyles,
        previewStyles,
        changedStyles,
        computedEffects,
        layoutContext: cssDebugLayoutContextFor(target),
        interactions: target.interactions || [],
        primaryInteraction: target.primaryInteraction || null,
        sourceHints: target.selection.sourceHints,
        scopeGuard: target.scopeGuard || undefined,
        groupScale: groupScaleInfo,
      });
    }
    if (!changedTargets.length) return null;
    let primaryTarget = cssDebugSession.targets.get(cssDebugSession.activeTargetId);
    const activeHasChanges = primaryTarget && (Object.keys(cssDebugChangedStyles(primaryTarget.originalStyles, primaryTarget.previewStyles && Object.keys(primaryTarget.previewStyles).length ? { ...cssDebugComputedStyles(primaryTarget.element), ...primaryTarget.previewStyles } : {}, primaryTarget.activeProperties)).length > 0 || (primaryTarget.primaryInteraction && (primaryTarget.primaryInteraction.type === 'reorder' || primaryTarget.primaryInteraction.type === 'group-scale')));
    if (!activeHasChanges) {
      primaryTarget = cssDebugSession.targets.get(changedTargets[changedTargets.length - 1].id) || primaryTarget;
    }
    const primary = primaryTarget?.selection;
    if (!primary) return null;
    const primaryPreviewStyles = primaryTarget.previewStyles && Object.keys(primaryTarget.previewStyles).length
      ? { ...cssDebugComputedStyles(primaryTarget.element), ...primaryTarget.previewStyles }
      : {};
    const primaryChangedStyles = cssDebugChangedStyles(primaryTarget.originalStyles, primaryPreviewStyles, primaryTarget.activeProperties);
    const primaryComputedEffects = cssDebugComputedEffects(primaryTarget.originalStyles, primaryPreviewStyles, primaryTarget.activeProperties);
    const cssDebug = {
      selection: primary,
      selectedElement: primary.dom,
      originalStyles: primaryTarget.originalStyles,
      previewStyles: primaryPreviewStyles,
      changedStyles: primaryChangedStyles,
      computedEffects: primaryComputedEffects,
      layoutContext: cssDebugLayoutContextFor(primaryTarget),
      interactions: primaryTarget.interactions || [],
      primaryInteraction: primaryTarget.primaryInteraction || null,
      scopeGuard: primaryTarget.scopeGuard || undefined,
      batch: true,
      primaryTargetId: primaryTarget.id,
      changedTargetCount: changedTargets.length,
      targets: changedTargets,
      session: cssDebugSession.sessionInfo,
    };
    return {
      ...primary,
      id: 'selection-' + Date.now(),
      sessionId: activePanelSessionId,
      timestamp: Date.now(),
      mode: 'css-debug',
      instruction: 'CSS 调试（' + changedTargets.length + ' 个元素）：请根据浏览器中预览的样式 diff，结合源码线索把改动落到项目样式中。优先修改源码里的 class/style，不要直接照搬 inline style，注意布局影响范围。\\n\\n用户补充：' + (instruction || '无'),
      note: instruction || '',
      targets: changedTargets.map((t) => ({
        id: t.id,
        note: '',
        selection: t.selection,
        cssDebug: t,
      })),
      cssDebug
    };
  }
`;
//# sourceMappingURL=css-debug-payload-source.js.map