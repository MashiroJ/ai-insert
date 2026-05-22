/**
 * Source Hint Engine
 *
 * Analyzes elements and framework metadata to generate source code location hints.
 */

import type { UiInspectComponentInfo, UiInspectSourceHint } from '@ui-inspect/protocol';
import type { FrameworkAdapter } from '@ui-inspect/browser-adapter';

export interface SourceHintEngineOptions {
  projectRoot: string;
}

export interface SourceHintAnalysis {
  hints: UiInspectSourceHint[];
  confidence: number;
}

/**
 * Source Hint Engine class
 */
export class SourceHintEngine {
  constructor(private options: SourceHintEngineOptions) {}

  /**
   * Generate source hints for an element
   */
  generateHints(
    element: HTMLElement,
    componentInfo: UiInspectComponentInfo | null,
    adapter: FrameworkAdapter | null
  ): SourceHintAnalysis {
    const hints: UiInspectSourceHint[] = [];
    let maxConfidence = 0;

    // 1. Framework component hints (highest priority)
    if (componentInfo?.file) {
      hints.push({
        kind: 'component-file',
        file: this.relativePath(componentInfo.file),
        line: null,
        column: null,
        confidence: 0.95,
        reason: `Component ${componentInfo.name} is defined in this file`,
      });
      maxConfidence = Math.max(maxConfidence, 0.95);
    }

    // 2. Framework adapter hints
    if (adapter) {
      const adapterHints = adapter.getSourceHints(element);
      for (const hint of adapterHints) {
        hints.push({
          ...hint,
          file: this.relativePath(hint.file),
        });
        maxConfidence = Math.max(maxConfidence, hint.confidence);
      }
    }

    // 3. Template/inline hints
    const templateHint = this.extractTemplateHint(element);
    if (templateHint) {
      hints.push(templateHint);
      maxConfidence = Math.max(maxConfidence, templateHint.confidence);
    }

    // 4. DOM attribute hints
    const attrHints = this.extractAttributeHints(element);
    for (const hint of attrHints) {
      hints.push(hint);
      maxConfidence = Math.max(maxConfidence, hint.confidence);
    }

    // 5. Style file hints
    const styleHint = this.extractStyleHint(element);
    if (styleHint) {
      hints.push(styleHint);
      maxConfidence = Math.max(maxConfidence, styleHint.confidence);
    }

    // Sort by confidence descending
    hints.sort((a, b) => b.confidence - a.confidence);

    return { hints, confidence: maxConfidence };
  }

  /**
   * Extract template-related hints
   */
  private extractTemplateHint(element: HTMLElement): UiInspectSourceHint | null {
    // Check for inline templates
    const templateAttr = element.getAttribute('template');
    if (templateAttr) {
      return {
        kind: 'template-file',
        file: this.relativePath(templateAttr),
        line: null,
        column: null,
        confidence: 0.7,
        reason: 'Element has template attribute',
      };
    }

    // Check for slot usage (indicates template file)
    if (element.getAttribute('slot')) {
      return {
        kind: 'template-file',
        file: 'template', // Would need resolution
        line: null,
        column: null,
        confidence: 0.4,
        reason: 'Element is a slotted content',
      };
    }

    return null;
  }

  /**
   * Extract hints from DOM attributes
   */
  private extractAttributeHints(element: HTMLElement): UiInspectSourceHint[] {
    const hints: UiInspectSourceHint[] = [];

    // Check for data-source attribute
    const dataSource = element.getAttribute('data-source');
    if (dataSource) {
      const [file, linePart] = dataSource.split(':');
      const line = linePart ? parseInt(linePart, 10) : null;

      hints.push({
        kind: 'dom-attr',
        file: this.relativePath(file),
        line,
        column: null,
        confidence: 0.8,
        reason: 'Element has data-source attribute',
      });
    }

    // Check for data-file attribute
    const dataFile = element.getAttribute('data-file');
    if (dataFile) {
      hints.push({
        kind: 'dom-attr',
        file: this.relativePath(dataFile),
        line: null,
        column: null,
        confidence: 0.75,
        reason: 'Element has data-file attribute',
      });
    }

    // Check for inline event handlers
    for (const attr of Array.from(element.attributes)) {
      if (attr.name.startsWith('on') && attr.value) {
        hints.push({
          kind: 'dom-attr',
          file: window.location.pathname,
          line: null,
          column: null,
          confidence: 0.3,
          reason: `Inline event handler: ${attr.name}`,
          metadata: {
            event: attr.name,
            handler: attr.value,
          },
        });
      }
    }

    return hints;
  }

  /**
   * Extract style-related hints
   */
  private extractStyleHint(element: HTMLElement): UiInspectSourceHint | null {
    // Check for scoped style attribute (Vue)
    const scopedAttr = Array.from(element.attributes).find((attr) =>
      attr.name.startsWith('data-v-')
    );

    if (scopedAttr) {
      return {
        kind: 'style-file',
        file: 'component', // Would need actual resolution
        line: null,
        column: null,
        confidence: 0.6,
        reason: 'Element has scoped style attribute',
        metadata: {
          scopedAttr: scopedAttr.name,
        },
      };
    }

    // Check for inline style attribute
    if (element.getAttribute('style')) {
      return {
        kind: 'style-file',
        file: window.location.pathname,
        line: null,
        column: null,
        confidence: 0.2,
        reason: 'Element has inline styles',
      };
    }

    return null;
  }

  /**
   * Convert absolute path to relative path
   */
  private relativePath(path: string): string {
    if (!path) return path;

    // If path starts with project root, make it relative
    if (path.startsWith(this.options.projectRoot)) {
      return path.slice(this.rootLength + 1).replace(/^\//, '');
    }

    // If path is absolute, try to make it relative
    if (path.startsWith('/')) {
      const parts = path.split('/').filter(Boolean);
      // Keep last 2-3 parts for brevity
      return parts.slice(-3).join('/');
    }

    return path;
  }

  private get rootLength(): number {
    return this.options.projectRoot.length;
  }

  /**
   * Enhance hints with additional metadata
   */
  enhanceHints(
    hints: UiInspectSourceHint[],
    metadata: Record<string, unknown>
  ): UiInspectSourceHint[] {
    return hints.map((hint) => ({
      ...hint,
      metadata: {
        ...hint.metadata,
        ...metadata,
      },
    }));
  }

  /**
   * Filter hints by minimum confidence
   */
  filterByConfidence(hints: UiInspectSourceHint[], minConfidence: number): UiInspectSourceHint[] {
    return hints.filter((hint) => hint.confidence >= minConfidence);
  }

  /**
   * Get best hint (highest confidence)
   */
  getBestHint(hints: UiInspectSourceHint[]): UiInspectSourceHint | null {
    if (hints.length === 0) return null;
    return hints[0];
  }

  /**
   * Merge hints from multiple sources
   */
  mergeHints(...hintArrays: UiInspectSourceHint[][]): UiInspectSourceHint[] {
    const allHints = hintArrays.flat();
    const seen = new Set<string>();

    // Deduplicate by file + line + kind
    const unique = allHints.filter((hint) => {
      const key = `${hint.file}:${hint.line}:${hint.kind}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.sort((a, b) => b.confidence - a.confidence);
  }
}
