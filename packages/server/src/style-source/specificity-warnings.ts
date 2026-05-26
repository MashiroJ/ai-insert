import type { UiInspectCssDebugTarget, UiInspectSpecificityWarning } from '@ui-inspect/protocol';

export function buildSpecificityWarnings(target: UiInspectCssDebugTarget): UiInspectSpecificityWarning[] {
  const warnings: UiInspectSpecificityWarning[] = [];
  
  if (!target.styleSourceHints || target.styleSourceHints.length === 0) {
    return warnings;
  }

  // Check for low-confidence hints that might be overridden
  const lowConfidenceHints = target.styleSourceHints.filter(h => h.confidence < 0.6);
  
  for (const hint of lowConfidenceHints) {
    const hasHighConfidenceCompeting = target.styleSourceHints.some(other =>
      other.id !== hint.id &&
      other.confidence > 0.8 &&
      other.properties.some(p => hint.properties.includes(p))
    );
    
    if (hasHighConfidenceCompeting) {
      warnings.push({
        property: hint.properties[0] || 'unknown',
        message: `Low-confidence rule at ${hint.file}:${hint.line ?? '?'} may be overridden by higher-specificity rules.`,
        suggestion: 'Consider increasing selector specificity or using !important as a last resort.',
        severity: 'warning',
      });
    }
  }

  // Check for scoped vs global style conflicts (multiple rules for same selector)
  const hintsBySelector = new Map<string, any[]>();
  for (const hint of target.styleSourceHints) {
    if (!hint.selector) continue;
    
    const key = `${hint.selector}:${hint.properties.join(',')}`;
    if (!hintsBySelector.has(key)) {
      hintsBySelector.set(key, []);
    }
    hintsBySelector.get(key)!.push(hint);
  }
  
  for (const [key, hints] of hintsBySelector) {
    if (hints.length > 1) {
      const hasScopedAndGlobal = hints.some(h => h.kind === 'vue-sfc-style-rule') &&
                                  hints.some(h => h.kind === 'style-rule');
      
      if (hasScopedAndGlobal) {
        warnings.push({
          property: hints[0].properties[0] || 'unknown',
          message: `Multiple style rules declare the same properties. Scoped and global styles may conflict.`,
          suggestion: 'Consider consolidating scoped and global styles to avoid specificity conflicts.',
          severity: 'info',
        });
      }
    }
  }

  // Check for !important in changed styles
  for (const prop of Object.keys(target.changedStyles)) {
    const value = target.changedStyles[prop];
    if (typeof value === 'string' && value.includes('!important')) {
      warnings.push({
        property: prop,
        message: `Using !important for ${prop} can cause maintenance issues.`,
        suggestion: 'Prefer increasing selector specificity over !important.',
        severity: 'warning',
      });
    }
  }

  return warnings;
}
