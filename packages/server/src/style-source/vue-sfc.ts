import type { VueSfcBlock } from './types.js';

export function parseVueSfcBlocks(content: string): VueSfcBlock[] {
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

      // Parse attributes
      const langMatch = attrs.match(/lang="([^"]+)"/);
      const scopedMatch = attrs.includes('scoped');
      const lang = langMatch ? langMatch[1] : undefined;

      i++;
      while (i < lines.length) {
        const closingTag = isStyle ? '</style>' : '</template>';
        if (lines[i].includes(closingTag)) {
          endLine = i;
          break;
        }
        contentLines.push(lines[i]);
        i++;
      }

      blocks.push({
        tag: isStyle ? 'style' : 'template',
        lang,
        scoped: scopedMatch && isStyle,
        startLine,
        endLine,
        content: contentLines.join('\n'),
      });
    }
    i++;
  }

  return blocks;
}

export function extractTemplateClasses(content: string): string[] {
  const classes = new Set<string>();
  const classRegex = /class=["']([^"']+)["']/g;
  const shorthandRegex = /:class=["']{([^}]+)}["']/g;
  
  let match;
  while ((match = classRegex.exec(content)) !== null) {
    const classList = match[1].split(/\s+/);
    classList.forEach((cls) => {
      if (cls) classes.add(cls);
    });
  }

  while ((match = shorthandRegex.exec(content)) !== null) {
    const bindings = match[1].split(/[,{}]/).map(s => s.trim().replace(/['"]/g, ''));
    bindings.forEach((cls) => {
      if (cls && /^[a-zA-Z_][\w-]*$/.test(cls)) {
        classes.add(cls);
      }
    });
  }

  return Array.from(classes);
}
