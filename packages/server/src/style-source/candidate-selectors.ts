import type { CandidateSelector } from './types.js';
import type { UiInspectCssDebugTarget, UiInspectCssDebugPayload } from '@ui-inspect/protocol';

export function collectCandidateSelectors(
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

export function extractClassesFromSelector(selector: string): string[] {
  const classes: string[] = [];
  const regex = /\.([\w-]+)/g;
  let match;
  while ((match = regex.exec(selector)) !== null) {
    classes.push(match[1]);
  }
  return classes;
}
