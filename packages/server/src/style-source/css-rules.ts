import type { CssRule } from './types.js';

const MAX_SNIPPET_LENGTH = 200;

export function scanCssRules(content: string): CssRule[] {
  const rules: CssRule[] = [];
  const lines = content.split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    
    // Skip comments, empty lines, and at-rules
    if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('@') || trimmed === '}') {
      i++;
      continue;
    }

    // Start of a rule
    if (trimmed.includes('{')) {
      const selectorMatch = trimmed.match(/^([^{]+){/);
      if (selectorMatch) {
        const selector = selectorMatch[1].trim();
        const startLine = i + 1; // 1-indexed
        const properties: string[] = [];
        const snippetLines: string[] = [];
        
        i++;
        let depth = 1;
        let endLine = startLine;
        
        while (i < lines.length && depth > 0) {
          const line = lines[i];
          snippetLines.push(line);
          
          if (line.includes('{')) depth++;
          if (line.includes('}')) depth--;
          
          if (depth > 0) {
            const propMatch = line.trim().match(/^([\w-]+)\s*:/);
            if (propMatch) {
              properties.push(propMatch[1]);
            }
            endLine = i + 1;
          }
          
          i++;
        }
        
        const snippet = snippetLines.join('\n').slice(0, MAX_SNIPPET_LENGTH);
        
        rules.push({
          selector,
          startLine,
          endLine,
          properties,
          snippet,
        });
        
        continue;
      }
    }
    
    i++;
  }
  
  return rules;
}

export function isCssLikeFile(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase();
  return ext === 'css' || ext === 'scss' || ext === 'sass' || ext === 'less';
}
