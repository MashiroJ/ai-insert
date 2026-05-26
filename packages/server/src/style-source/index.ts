import type { UiInspectCssDebugPayload, UiInspectCssDebugTarget } from '@ui-inspect/protocol';
import { collectCandidateFiles } from './candidate-files.js';
import { collectCandidateSelectors } from './candidate-selectors.js';
import { buildLayoutHints } from './layout-hints.js';
import { buildSpecificityWarnings } from './specificity-warnings.js';
import { rankHints, matchRuleToSelectors, buildHintFromRule, makeFallbackHint } from './ranking.js';
import { parseVueSfcBlocks, extractTemplateClasses } from './vue-sfc.js';
import { scanCssRules, isCssLikeFile } from './css-rules.js';
import { inferTemplateLine } from './template-line.js';
import { clonePayload, tryReadFile } from './utils.js';

export interface BuildStyleSourceHintsInput {
  projectRoot: string;
  cssDebug: UiInspectCssDebugPayload;
  contextLines?: number;
  maxHintsPerTarget?: number;
  maxTotalHints?: number;
}

const DEFAULT_MAX_HINTS_PER_TARGET = 5;
const DEFAULT_MAX_TOTAL_HINTS = 20;

export function buildCssDebugStyleSourceHints(
  input: BuildStyleSourceHintsInput,
): UiInspectCssDebugPayload {
  const maxHintsPerTarget = input.maxHintsPerTarget ?? DEFAULT_MAX_HINTS_PER_TARGET;
  const maxTotalHints = input.maxTotalHints ?? DEFAULT_MAX_TOTAL_HINTS;

  const payload = clonePayload(input.cssDebug);
  let targets = payload.targets ?? [];

  // Fallback: wrap top-level payload as a single synthetic target for
  // old single-target CSS Debug payloads without an explicit targets array.
  if (targets.length === 0 && Object.keys(payload.changedStyles).length > 0) {
    const synthetic: UiInspectCssDebugTarget = {
      id: payload.primaryTargetId ?? 'css-el-0',
      selection: payload.selection,
      selectedElement: payload.selectedElement,
      originalStyles: payload.originalStyles,
      previewStyles: payload.previewStyles,
      changedStyles: payload.changedStyles,
      computedEffects: payload.computedEffects,
      layoutContext: payload.layoutContext,
      interactions: payload.interactions,
      primaryInteraction: payload.primaryInteraction,
      note: payload.note,
      sourceHints: payload.sourceHints,
      layoutHints: payload.layoutHints,
      specificityWarnings: payload.specificityWarnings,
    };
    targets = [synthetic];
    payload.targets = targets;
  }

  const allHints: any[] = [];

  for (const target of targets) {
    if (allHints.length >= maxTotalHints) break;

    const candidateFiles = collectCandidateFiles(target, payload, input.projectRoot);
    const candidateSelectors = collectCandidateSelectors(target, payload);
    const changedProps = Object.keys(target.changedStyles);

    const hints: any[] = [];

    for (const file of candidateFiles) {
      if (hints.length >= maxHintsPerTarget) break;

      const content = tryReadFile(file.absolute);
      if (content === null) continue;

      if (file.relative.endsWith('.vue')) {
        hints.push(...scanVueSfc(
          content, file.relative, target, candidateSelectors, changedProps,
        ));

        // Vue SFC template line inference
        inferTemplateLine(content, file.relative, target);
      } else if (isCssLikeFile(file.relative)) {
        hints.push(...scanCssFile(
          content, file.relative, target, candidateSelectors, changedProps,
        ));
      }

      if (hints.length === 0 && changedProps.length > 0) {
        hints.push(makeFallbackHint(file.relative, target, changedProps));
      }
    }

    const ranked = rankHints(hints, target);
    const capped = ranked.slice(0, maxHintsPerTarget);
    target.styleSourceHints = capped;
    allHints.push(...capped);

    // Generate layoutHints for move/transform interactions
    target.layoutHints = buildLayoutHints(target);

    // Generate specificityWarnings
    target.specificityWarnings = buildSpecificityWarnings(target);
  }

  if (allHints.length > 0) {
    payload.styleSourceHints = allHints.slice(0, maxTotalHints);
  }

  return payload;
}

function scanVueSfc(
  content: string,
  relativePath: string,
  target: UiInspectCssDebugTarget,
  candidateSelectors: any[],
  changedProps: string[],
): any[] {
  const blocks = parseVueSfcBlocks(content);
  const hints: any[] = [];

  const templateClasses = new Set<string>();
  for (const block of blocks) {
    if (block.tag === 'template') {
      extractTemplateClasses(block.content).forEach((cls) => templateClasses.add(cls));
    }
  }

  for (const block of blocks) {
    if (block.tag !== 'style') continue;

    const rules = scanCssRules(block.content);
    for (const rule of rules) {
      const adjustedStartLine = block.startLine + rule.startLine;
      const adjustedEndLine = block.startLine + rule.endLine;

      const match = matchRuleToSelectors(rule.selector, candidateSelectors);
      if (!match) continue;

      const hint = buildHintFromRule(
        rule, relativePath, target, changedProps, adjustedStartLine, adjustedEndLine,
        block.scoped ? 'vue-sfc-style-rule' : 'style-rule', match,
      );
      if (hint) hints.push(hint);
    }

    // Check for parent-layout rules
    const parentSelector = target.layoutContext?.parent?.className
      ? `.${target.layoutContext.parent.className.split(/\s+/)[0]}`
      : target.layoutContext?.parent?.selector;

    if (parentSelector) {
      for (const rule of rules) {
        const adjustedStartLine = block.startLine + rule.startLine;
        const adjustedEndLine = block.startLine + rule.endLine;

        if (rule.selector.includes(parentSelector) || parentSelector.includes(rule.selector)) {
          hints.push({
            id: `hint-${target.id}-parent-${hints.length + 1}`,
            targetId: target.id,
            kind: 'parent-layout-rule',
            file: relativePath,
            line: adjustedStartLine,
            endLine: adjustedEndLine,
            selector: rule.selector,
            snippet: rule.snippet,
            matchedBy: [`parent-selector:${parentSelector}`],
            properties: rule.properties,
            confidence: 0.6,
            reason: `Parent selector "${parentSelector}" matches this rule.`,
          });
        }
      }
    }
  }

  // Check for template class matches without style rules
  const elClasses = (target.selectedElement.className ?? '').split(/\s+/).filter(Boolean);
  const hasStyleRuleForClass = hints.some((h) =>
    h.kind === 'vue-sfc-style-rule' || h.kind === 'style-rule',
  );

  if (!hasStyleRuleForClass && elClasses.length > 0 && templateClasses.size > 0) {
    for (const cls of elClasses) {
      if (templateClasses.has(cls)) {
        hints.push({
          id: `hint-${target.id}-${hints.length + 1}`,
          targetId: target.id,
          kind: 'template-class',
          file: relativePath,
          line: null,
          matchedBy: [`template-class:${cls}`],
          properties: changedProps,
          confidence: 0.65,
          reason: `Class .${cls} is used in the template but no matching style rule was found.`,
        });
      }
    }
  }

  return hints;
}

function scanCssFile(
  content: string,
  relativePath: string,
  target: UiInspectCssDebugTarget,
  candidateSelectors: any[],
  changedProps: string[],
): any[] {
  const rules = scanCssRules(content);
  const hints: any[] = [];

  for (const rule of rules) {
    const match = matchRuleToSelectors(rule.selector, candidateSelectors);
    if (!match) continue;

    const hint = buildHintFromRule(
      rule, relativePath, target, changedProps, rule.startLine, rule.endLine,
      'style-rule', match,
    );
    if (hint) hints.push(hint);
  }

  // Check for parent-layout rules
  const parentSelector = target.layoutContext?.parent?.className
    ? `.${target.layoutContext.parent.className.split(/\s+/)[0]}`
    : target.layoutContext?.parent?.selector;

  if (parentSelector) {
    for (const rule of rules) {
      if (rule.selector.includes(parentSelector) || parentSelector.includes(rule.selector)) {
        hints.push({
          id: `hint-${target.id}-parent-${hints.length + 1}`,
          targetId: target.id,
          kind: 'parent-layout-rule',
          file: relativePath,
          line: rule.startLine,
          endLine: rule.endLine,
          selector: rule.selector,
          snippet: rule.snippet,
          matchedBy: [`parent-selector:${parentSelector}`],
          properties: rule.properties,
          confidence: 0.6,
          reason: `Parent selector "${parentSelector}" matches this rule.`,
        });
      }
    }
  }

  return hints;
}

export type { BuildStyleSourceHintsInput };
