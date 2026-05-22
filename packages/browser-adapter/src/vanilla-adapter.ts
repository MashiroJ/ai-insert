/**
 * Vanilla JS adapter for pure DOM scenarios
 *
 * This adapter provides basic functionality when no framework is detected.
 * It works with plain HTML/CSS/JavaScript without any framework.
 */

import type {
  ComponentInfo,
  ComponentTreeNode,
  FrameworkAdapter,
  SourceHint,
  SourceLocation,
  PropValue,
  StateValue,
} from './interfaces.js';

/**
 * Vanilla JS framework adapter
 */
export class VanillaAdapter implements FrameworkAdapter {
  readonly name = 'vanilla';

  getComponentInfo(element: HTMLElement): ComponentInfo | null {
    // For vanilla, use tag name and classes as component identifier
    const tagName = element.tagName.toLowerCase();
    const classes = Array.from(element.classList)
      .filter((c) => !c.startsWith('ui-inspect'))
      .slice(0, 2);

    const displayName = classes.length > 0
      ? `${tagName}.${classes.join('.')}`
      : tagName;

    return {
      name: tagName,
      displayName,
    };
  }

  getComponentChain(element: HTMLElement): ComponentInfo[] {
    const chain: ComponentInfo[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      const info = this.getComponentInfo(current);
      if (info) {
        chain.unshift(info);
      }
      current = current.parentElement;
    }

    return chain;
  }

  getComponentTree(element: HTMLElement): ComponentTreeNode {
    const info = this.getComponentInfo(element) || {
      name: element.tagName.toLowerCase(),
    };

    const children: ComponentTreeNode[] = [];

    for (const child of Array.from(element.children)) {
      if (child instanceof HTMLElement) {
        children.push(this.getComponentTree(child));
      }
    }

    return {
      info,
      children,
      depth: 0,
    };
  }

  getSourceLocation(element: HTMLElement): SourceLocation | null {
    // Vanilla has no source location, check for data attributes
    const dataFile = element.getAttribute('data-file');
    if (dataFile) {
      return {
        file: dataFile,
        line: null,
        column: null,
      };
    }

    return null;
  }

  getSourceHints(element: HTMLElement): SourceHint[] {
    const hints: SourceHint[] = [];

    // Check for data-source attribute
    const dataSource = element.getAttribute('data-source');
    if (dataSource) {
      const [file, lineStr] = dataSource.split(':');
      const line = lineStr ? parseInt(lineStr, 10) : null;

      hints.push({
        kind: 'heuristic',
        file,
        line,
        column: null,
        confidence: 0.8,
        reason: 'data-source attribute present',
      });
    }

    // Check for inline event handlers
    for (const attr of Array.from(element.attributes)) {
      if (attr.name.startsWith('on') && attr.value) {
        hints.push({
          kind: 'heuristic',
          file: window.location.pathname,
          line: null,
          column: null,
          confidence: 0.3,
          reason: `inline event handler: ${attr.name}`,
          metadata: {
            event: attr.name,
            handler: attr.value,
          },
        });
      }
    }

    return hints;
  }

  getComponentProps(element: HTMLElement): Record<string, PropValue> {
    const props: Record<string, PropValue> = {};

    // Extract data attributes as props
    for (const attr of Array.from(element.attributes)) {
      if (attr.name.startsWith('data-')) {
        const propName = attr.name.replace(/^ data-/, '');
        props[propName] = attr.value;
      }
    }

    // Add common attributes
    if (element.id) {
      props.id = element.id;
    }

    if (element.className) {
      props.className = element.className;
    }

    return props;
  }

  getComponentState(): Record<string, StateValue> | null {
    // Vanilla has no component state
    return null;
  }

  isAvailable(): boolean {
    // Vanilla adapter is always available as a fallback
    return true;
  }
}

/**
 * Singleton instance
 */
export const vanillaAdapter = new VanillaAdapter();
