import type {
  UiInspectCssDebugPayload,
  UiInspectCssDebugTarget,
  UiInspectStyleSourceHint,
  UiInspectStyleSourceHintKind,
} from '@ui-inspect/protocol';
import { existsSync, readFileSync } from 'node:fs';
import { join, isAbsolute, relative, resolve, sep } from 'node:path';

export interface BuildStyleSourceHintsInput {
  projectRoot: string;
  cssDebug: UiInspectCssDebugPayload;
  contextLines?: number;
  maxHintsPerTarget?: number;
  maxTotalHints?: number;
}

interface CssRule {
  selector: string;
  startLine: number;
  endLine: number;
  properties: string[];
  snippet: string;
}

interface VueSfcBlock {
  tag: 'template' | 'style';
  lang?: string;
  scoped?: boolean;
  startLine: number;
  endLine: number;
  content: string;
}

interface CandidateFile {
  absolute: string;
  relative: string;
}

const DEFAULT_MAX_HINTS_PER_TARGET = 5;
const DEFAULT_MAX_TOTAL_HINTS = 20;
const MAX_SNIPPET_LENGTH = 200;

const GENERIC_TAGS = new Set(['div', 'span', 'img', 'p', 'a', 'button', 'input', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'section', 'article', 'main', 'header', 'footer', 'nav']);

const LAYOUT_PROPERTIES = new Set([
  'justify-content', 'align-items', 'align-content', 'align-self',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'gap', 'row-gap', 'column-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
  'display', 'position', 'top', 'right', 'bottom', 'left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'transform',
]);

const SIZE_PROPERTIES = new Set(['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height']);

const TYPOGRAPHY_PROPERTIES = new Set(['font-size', 'font-weight', 'line-height', 'letter-spacing', 'color']);

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
    };
    targets = [synthetic];
    payload.targets = targets;
  }

  const allHints: UiInspectStyleSourceHint[] = [];

  for (const target of targets) {
    if (allHints.length >= maxTotalHints) break;

    const candidateFiles = collectCandidateFiles(target, payload, input.projectRoot);
    const candidateSelectors = collectCandidateSelectors(target, payload);
    const changedProps = Object.keys(target.changedStyles);

    const hints: UiInspectStyleSourceHint[] = [];

    for (const file of candidateFiles) {
      if (hints.length >= maxHintsPerTarget) break;

      const content = tryReadFile(file.absolute);
      if (content === null) continue;

      if (file.relative.endsWith('.vue')) {
        hints.push(...scanVueSfc(
          content, file.relative, target, candidateSelectors, changedProps,
        ));
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
  }

  if (allHints.length > 0) {
    payload.styleSourceHints = allHints.slice(0, maxTotalHints);
  }

  return payload;
}

function clonePayload(payload: UiInspectCssDebugPayload): UiInspectCssDebugPayload {
  return JSON.parse(JSON.stringify(payload));
}

function collectCandidateFiles(
  target: UiInspectCssDebugTarget,
  payload: UiInspectCssDebugPayload,
  projectRoot: string,
): CandidateFile[] {
  const paths = new Set<string>();
  const resolvedRoot = resolve(projectRoot);

  const addPath = (p: string | null | undefined) => {
    if (!p || typeof p !== 'string') return;
    const absolute = resolve(resolvedRoot, p);
    if (!isInsideProject(absolute, resolvedRoot)) return;
    paths.add(absolute);
  };

  addPath(target.selection.source?.file);
  addPath(target.selection.vue?.sourceFile);
  addPath(target.selection.component?.file);

  for (const hint of target.sourceHints ?? []) addPath(hint.file as string | null | undefined);
  for (const hint of payload.sourceHints ?? []) addPath(hint.file as string | null | undefined);

  const result: CandidateFile[] = [];
  for (const absolute of paths) {
    result.push({ absolute, relative: relative(projectRoot, absolute) });
  }

  return result.slice(0, 5);
}

interface CandidateSelector {
  value: string;
  source: 'class' | 'tag' | 'parent-class' | 'dom-selector';
}

function collectCandidateSelectors(
  target: UiInspectCssDebugTarget,
  _payload: UiInspectCssDebugPayload,
): CandidateSelector[] {
  const selectors: CandidateSelector[] = [];
  const seen = new Set<string>();

  const add = (value: string, source: CandidateSelector['source']) => {
    const key = `${source}:${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    selectors.push({ value, source });
  };

  const el = target.selectedElement;
  const elClasses = el.className ? el.className.split(/\s+/).filter(Boolean) : [];

  // Collect all parent classes from layoutContext.parent.className
  const parentSnapshot = target.layoutContext?.parent;
  const parentClasses = parentSnapshot?.className
    ? parentSnapshot.className.split(/\s+/).filter(Boolean)
    : [];

  // Also collect parent classes from context.parentChain attributes
  const parentChainClasses: string[][] = [];
  const parentChain = target.selection.context?.parentChain;
  if (parentChain) {
    for (const parent of parentChain) {
      const attrs = parent.attributes;
      if (attrs?.class) {
        parentChainClasses.push(attrs.class.split(/\s+/).filter(Boolean));
      }
      // Also extract classes from selector like div.login-left > ...
      if (parent.selector) {
        const selectorClasses = extractClassesFromSelector(parent.selector);
        if (selectorClasses.length > 0) {
          parentChainClasses.push(selectorClasses);
        }
      }
    }
  }

  // Merge all parent class sources
  const allParentClasses = new Set<string>([...parentClasses, ...parentChainClasses.flat()]);

  // Element class-based selectors
  for (const cls of elClasses) {
    add(cls, 'class');
    add(`.${cls}`, 'class');
    add(`.${cls} ${el.tagName}`, 'class');

    // Combined parent + element selectors
    for (const pc of allParentClasses) {
      add(`.${pc} .${cls}`, 'parent-class');
      add(`.${pc} ${el.tagName}`, 'parent-class');
    }
  }

  // Tag name
  if (el.tagName) {
    add(el.tagName, 'tag');
  }

  // Standalone parent class selectors
  for (const pc of allParentClasses) {
    add(pc, 'parent-class');
    add(`.${pc}`, 'parent-class');
  }

  // DOM selector (may be complex like "div:nth-of-type(1) > div.login-left > img")
  if (el.selector) {
    add(el.selector, 'dom-selector');
    // Also extract classes from the DOM selector
    for (const sc of extractClassesFromSelector(el.selector)) {
      add(sc, 'dom-selector');
    }
  }

  return selectors;
}

function extractClassesFromSelector(selector: string): string[] {
  const classes: string[] = [];
  const regex = /\.([\w-]+)/g;
  let match;
  while ((match = regex.exec(selector)) !== null) {
    classes.push(match[1]);
  }
  return classes;
}

function scanVueSfc(
  content: string,
  relativePath: string,
  target: UiInspectCssDebugTarget,
  candidateSelectors: CandidateSelector[],
  changedProps: string[],
): UiInspectStyleSourceHint[] {
  const blocks = parseVueSfcBlocks(content);
  const hints: UiInspectStyleSourceHint[] = [];

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
  candidateSelectors: CandidateSelector[],
  changedProps: string[],
): UiInspectStyleSourceHint[] {
  const rules = scanCssRules(content);
  const hints: UiInspectStyleSourceHint[] = [];

  for (const rule of rules) {
    const match = matchRuleToSelectors(rule.selector, candidateSelectors);
    if (!match) continue;

    const hint = buildHintFromRule(
      rule, relativePath, target, changedProps, rule.startLine, rule.endLine,
      'style-rule', match,
    );
    if (hint) hints.push(hint);
  }

  return hints;
}

function parseVueSfcBlocks(content: string): VueSfcBlock[] {
  const blocks: VueSfcBlock[] = [];
  const lines = content.split('\n');

  let i = 0;
  while (i < lines.length) {
    const templateMatch = lines[i].match(/^<template([^>]*)>/);
    const styleMatch = lines[i].match(/^<style([^>]*)>/);

    if (templateMatch || styleMatch) {
      const isStyle = !!styleMatch;
      const attrs = (templateMatch || styleMatch)![1];
      const startLine = i + 1; // 1-indexed for content start
      let endLine = i + 1;
      const contentLines: string[] = [];

      const langMatch = attrs.match(/lang=["']?(\w+)/);
      const scopedMatch = attrs.match(/scoped/);

      i++;
      while (i < lines.length) {
        const closeTag = isStyle ? '<\/style>' : '<\/template>';
        if (lines[i].match(new RegExp(closeTag))) {
          endLine = i;
          break;
        }
        contentLines.push(lines[i]);
        i++;
      }

      blocks.push({
        tag: isStyle ? 'style' : 'template',
        lang: langMatch?.[1],
        scoped: !!scopedMatch,
        startLine,
        endLine,
        content: contentLines.join('\n'),
      });
    }
    i++;
  }

  return blocks;
}

function extractTemplateClasses(content: string): string[] {
  const classes: string[] = [];
  const regex = /class=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    for (const cls of match[1].split(/\s+/).filter(Boolean)) {
      classes.push(cls);
    }
  }
  return classes;
}

interface CssRuleWithOffset extends CssRule {
  lineOffset: number;
}

function scanCssRules(content: string): CssRuleWithOffset[] {
  const rules: CssRuleWithOffset[] = [];
  const lines = content.split('\n');

  let i = 0;
  while (i < lines.length) {
    const selectorMatch = lines[i].match(/^\s*([^{}\n]+?)\s*\{/);
    if (selectorMatch) {
      const selector = selectorMatch[1].trim();
      const startLine = i + 1; // 1-indexed
      const propertyLines: string[] = [];
      let braceDepth = 1;
      let j = i + 1;
      const properties: string[] = [];

      // Count opening brace on selector line
      const selectorLineBraces = (lines[i].match(/\{/g) || []).length - 1;
      braceDepth += selectorLineBraces;

      while (j < lines.length && braceDepth > 0) {
        const line = lines[j];
        const opens = (line.match(/\{/g) || []).length;
        const closes = (line.match(/\}/g) || []).length;
        braceDepth += opens - closes;

        if (braceDepth > 0) {
          propertyLines.push(line);
          const propMatch = line.match(/^\s*([\w-]+)\s*:/);
          if (propMatch) properties.push(propMatch[1]);
        }
        j++;
      }

      const endLine = j; // 1-indexed
      const snippet = [lines[i], ...propertyLines].join('\n').slice(0, MAX_SNIPPET_LENGTH);

      rules.push({
        selector,
        startLine,
        endLine,
        properties,
        snippet,
        lineOffset: 0,
      });

      i = j;
    } else {
      i++;
    }
  }

  return rules;
}

interface SelectorMatch {
  matchedSelector: CandidateSelector;
  overlapCount: number;
}

function matchRuleToSelectors(
  ruleSelector: string,
  candidateSelectors: CandidateSelector[],
): SelectorMatch | null {
  let bestMatch: SelectorMatch | null = null;

  for (const candidate of candidateSelectors) {
    if (ruleSelector === candidate.value) {
      return { matchedSelector: candidate, overlapCount: 1 };
    }

    // Check if candidate appears as part of the rule selector
    const ruleParts = ruleSelector.split(/[\s,>+~]+/).map((s) => s.replace(/^\./, ''));
    const candidateValue = candidate.value.replace(/^\./, '');

    if (ruleParts.some((part) => part === candidateValue)) {
      const count = ruleParts.filter((part) => part === candidateValue).length;
      if (!bestMatch || count > bestMatch.overlapCount) {
        bestMatch = { matchedSelector: candidate, overlapCount: count };
      }
    }
  }

  return bestMatch;
}

function buildHintFromRule(
  rule: CssRuleWithOffset,
  relativePath: string,
  target: UiInspectCssDebugTarget,
  changedProps: string[],
  adjustedStartLine: number,
  adjustedEndLine: number,
  kind: UiInspectStyleSourceHintKind,
  match: SelectorMatch,
): UiInspectStyleSourceHint | null {
  const ruleProps = new Set(rule.properties);
  const changedInRule = changedProps.filter((p) => ruleProps.has(p));
  const hasPropertyOverlap = changedInRule.length > 0;

  let confidence: number;
  const reasonParts: string[] = [];

  const isGeneric = GENERIC_TAGS.has(target.selectedElement.tagName?.toLowerCase() ?? '');

  if (hasPropertyOverlap) {
    confidence = 0.90;
    reasonParts.push(`Rule already defines ${changedInRule.join(', ')}.`);
  } else {
    confidence = 0.82;
    reasonParts.push(`Selector matches but rule does not yet declare the changed properties.`);
  }

  // Penalize generic selectors
  if (match.matchedSelector.source === 'tag' && isGeneric) {
    confidence -= 0.15;
    reasonParts.push('Generic tag selector, lower confidence.');
  }

  // Boost parent-layout for layout-related changes
  if (match.matchedSelector.source === 'parent-class') {
    const interaction = target.primaryInteraction;
    if (interaction?.type === 'move') {
      confidence = Math.max(confidence, 0.76);
      kind = 'parent-layout-rule';
      reasonParts.push('Move interaction suggests parent layout edit.');
    }
    if (changedProps.some((p) => LAYOUT_PROPERTIES.has(p))) {
      confidence = Math.max(confidence, 0.76);
      if (kind !== 'parent-layout-rule') kind = 'parent-layout-rule';
      reasonParts.push('Changed properties suggest layout container edit.');
    }
  }

  const matchedBy: string[] = [];
  if (match.matchedSelector.source === 'class') matchedBy.push(`class:${match.matchedSelector.value}`);
  else if (match.matchedSelector.source === 'tag') matchedBy.push(`tag:${match.matchedSelector.value}`);
  else if (match.matchedSelector.source === 'parent-class') matchedBy.push(`parent-class:${match.matchedSelector.value}`);
  else matchedBy.push(`dom:${match.matchedSelector.value}`);

  for (const prop of changedInRule) matchedBy.push(`property:${prop}`);

  return {
    id: `hint-${target.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    targetId: target.id,
    kind,
    file: relativePath,
    line: adjustedStartLine,
    endLine: adjustedEndLine,
    selector: rule.selector,
    matchedBy,
    properties: changedProps,
    confidence: Math.round(confidence * 100) / 100,
    reason: reasonParts.join(' '),
    snippet: rule.snippet,
  };
}

function makeFallbackHint(
  relativePath: string,
  target: UiInspectCssDebugTarget,
  changedProps: string[],
): UiInspectStyleSourceHint {
  return {
    id: `hint-${target.id}-fallback`,
    targetId: target.id,
    kind: 'fallback-source',
    file: relativePath,
    line: null,
    matchedBy: ['source-file'],
    properties: changedProps,
    confidence: 0.45,
    reason: `No matching style rule found. This file was identified as a candidate source file.`,
  };
}

function rankHints(
  hints: UiInspectStyleSourceHint[],
  target: UiInspectCssDebugTarget,
): UiInspectStyleSourceHint[] {
  const changedProps = Object.keys(target.changedStyles);
  const interaction = target.primaryInteraction;
  const parentClass = target.layoutContext?.parent?.className;
  const parentDisplay = target.layoutContext?.parent?.styles?.display;
  const isFlexOrGrid = parentDisplay === 'flex' || parentDisplay === 'grid' || parentDisplay === 'inline-flex' || parentDisplay === 'inline-grid';

  return hints.slice().sort((a, b) => {
    // For move-only transforms, prefer parent-layout hints
    const isTransformOnly = changedProps.length === 1 && changedProps[0] === 'transform';
    const hasMoveInteraction = interaction?.type === 'move';

    if (isTransformOnly && hasMoveInteraction && parentClass && isFlexOrGrid) {
      const aParent = a.kind === 'parent-layout-rule' ? 1 : 0;
      const bParent = b.kind === 'parent-layout-rule' ? 1 : 0;
      if (aParent !== bParent) return bParent - aParent;
    }

    // For size/color/font changes, prefer element rules
    const isOnlySizeOrVisual = changedProps.every((p) =>
      SIZE_PROPERTIES.has(p) || TYPOGRAPHY_PROPERTIES.has(p) || ['color', 'background-color', 'border', 'border-radius', 'box-shadow', 'opacity'].includes(p),
    );
    if (isOnlySizeOrVisual) {
      const aElement = a.kind === 'vue-sfc-style-rule' || a.kind === 'style-rule' ? 1 : 0;
      const bElement = b.kind === 'vue-sfc-style-rule' || b.kind === 'style-rule' ? 1 : 0;
      if (aElement !== bElement) return bElement - aElement;
    }

    return b.confidence - a.confidence;
  });
}

function isInsideProject(filePath: string, projectRoot: string): boolean {
  const rel = relative(projectRoot, filePath);
  if (isAbsolute(rel)) return false;
  const firstSegment = rel.split(sep)[0];
  return firstSegment !== '..';
}

function isCssLikeFile(path: string): boolean {
  return /\.(css|scss|less|sass|pcss|postcss)$/i.test(path);
}

function tryReadFile(absolutePath: string): string | null {
  try {
    if (!existsSync(absolutePath)) return null;
    return readFileSync(absolutePath, 'utf8');
  } catch {
    return null;
  }
}
