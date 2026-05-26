import type { CandidateSelector, CssRule } from './types.js';
import type { UiInspectStyleSourceHint } from '@ui-inspect/protocol';

const GENERIC_TAGS = new Set(['div', 'span', 'img', 'p', 'a', 'button', 'input', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'section', 'article', 'main', 'header', 'footer', 'nav']);

export interface RuleMatch {
  selector: string;
  kind: string;
  confidence: number;
}

export function matchRuleToSelectors(
  ruleSelector: string,
  candidateSelectors: CandidateSelector[],
): RuleMatch | null {
  // Exact match
  const exact = candidateSelectors.find(s => s.value === ruleSelector);
  if (exact) {
    return {
      selector: ruleSelector,
      kind: exact.source,
      confidence: exact.source === 'dom-selector' ? 0.95 : 0.9,
    };
  }

  // Class-based match
  if (ruleSelector.startsWith('.')) {
    const className = ruleSelector.slice(1).split(/\s|>/)[0];
    const classMatch = candidateSelectors.find(s => 
      s.value === className || s.value === `.${className}`
    );
    if (classMatch) {
      return {
        selector: ruleSelector,
        kind: 'class',
        confidence: 0.8,
      };
    }
  }

  // Tag-based match
  if (!ruleSelector.includes('.') && !ruleSelector.includes('#') && !ruleSelector.includes(':')) {
    const tag = ruleSelector.split(/\s|>/)[0];
    if (!GENERIC_TAGS.has(tag)) {
      const tagMatch = candidateSelectors.find(s => s.value === tag);
      if (tagMatch) {
        return {
          selector: ruleSelector,
          kind: 'tag',
          confidence: 0.6,
        };
      }
    }
  }

  // Partial match for complex selectors
  for (const candidate of candidateSelectors) {
    if (ruleSelector.includes(candidate.value)) {
      return {
        selector: ruleSelector,
        kind: candidate.source,
        confidence: 0.5,
      };
    }
  }

  return null;
}

export function buildHintFromRule(
  rule: CssRule,
  relativePath: string,
  target: UiInspectCssDebugTarget,
  changedProps: string[],
  startLine: number,
  endLine: number,
  kind: UiInspectStyleSourceHint['kind'],
  match: RuleMatch,
): UiInspectStyleSourceHint | null {
  const relevantProps = rule.properties.filter(p => changedProps.includes(p));
  
  if (relevantProps.length === 0) {
    return null;
  }

  return {
    id: `hint-${target.id}-${relativePath}-${startLine}`,
    targetId: target.id,
    kind,
    file: relativePath,
    line: startLine,
    endLine,
    selector: rule.selector,
    snippet: rule.snippet,
    matchedBy: [`${match.kind}:${match.selector}`],
    properties: relevantProps,
    confidence: match.confidence,
    reason: `Rule selector "${rule.selector}" matches the selected element.`,
  };
}

export function makeFallbackHint(
  relativePath: string,
  target: UiInspectCssDebugTarget,
  changedProps: string[],
): UiInspectStyleSourceHint {
  return {
    id: `hint-${target.id}-${relativePath}-fallback`,
    targetId: target.id,
    kind: 'fallback-source',
    file: relativePath,
    line: null,
    matchedBy: ['file-exists'],
    properties: changedProps,
    confidence: 0.3,
    reason: `File exists but no matching rules found. Consider adding rules for the changed properties.`,
  };
}

export function rankHints(
  hints: UiInspectStyleSourceHint[],
  _target: UiInspectCssDebugTarget,
): UiInspectStyleSourceHint[] {
  return hints.sort((a, b) => {
    // First by confidence
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    
    // Then by kind priority
    const kindPriority: Record<string, number> = {
      'vue-sfc-style-rule': 5,
      'style-rule': 4,
      'template-class': 3,
      'file': 2,
    };
    
    const aPriority = kindPriority[a.kind] || 0;
    const bPriority = kindPriority[b.kind] || 0;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    // Finally by number of matching properties
    return b.properties.length - a.properties.length;
  });
}
