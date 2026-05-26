import type { VueSfcBlock } from './types.js';
import { parseVueSfcBlocks } from './vue-sfc.js';
import type { UiInspectCssDebugTarget } from '@ui-inspect/protocol';

export function inferTemplateLine(
  content: string,
  relativePath: string,
  target: UiInspectCssDebugTarget,
): void {
  const blocks = parseVueSfcBlocks(content);
  
  for (const block of blocks) {
    if (block.tag !== 'template') continue;
    
    const lines = block.content.split('\n');
    const elClasses = (target.selectedElement.className ?? '').split(/\s+/).filter(Boolean);
    const elTag = target.selectedElement.tagName?.toLowerCase();
    
    // Find the best matching line in the template
    let bestMatch = -1;
    let bestScore = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let score = 0;
      
      // Score by matching class names
      for (const cls of elClasses) {
        if (line.includes(`class`) && line.includes(cls)) {
          score += 10;
        }
        if (line.includes(`.${cls}`)) {
          score += 5;
        }
      }
      
      // Score by matching tag name
      if (elTag && line.toLowerCase().includes(`<${elTag}`)) {
        score += 3;
      }
      
      // Prefer lines with class attributes
      if (line.includes('class=')) {
        score += 2;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = i;
      }
    }
    
    if (bestMatch >= 0 && bestScore > 0) {
      // Only update source.line if it's currently null
      if (target.selection.source.line === null) {
        target.selection.source.line = block.startLine + bestMatch + 1;
      }
      
      // Add template-file hint to sourceHints
      if (!target.selection.sourceHints) {
        target.selection.sourceHints = [];
      }
      
      target.selection.sourceHints.push({
        id: `template-hint-${target.id}`,
        kind: 'template-file',
        file: relativePath,
        line: block.startLine + bestMatch + 1,
        confidence: Math.min(0.9, 0.7 + (bestScore / 100)),
        metadata: {
          matchedBy: elClasses.length > 0 ? [`class:${elClasses[0]}`] : [`tag:${elTag}`],
        },
      });
    }
    
    break; // Only check first template block
  }
}
