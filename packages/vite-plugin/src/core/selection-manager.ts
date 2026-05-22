/**
 * Selection Manager
 *
 * Handles element selection, highlighting, and selector generation.
 */

import type { UiInspectComponentInfo, UiInspectSourceHint } from '@ui-inspect/protocol';
import type { ComponentInfo, FrameworkAdapter } from '@ui-inspect/browser-adapter';

export interface SelectionManagerOptions {
  boxId: string;
  onHover?: (element: HTMLElement | null) => void;
}

export interface ElementContext {
  accessibleName?: string;
  role?: string;
  attributes?: Record<string, string>;
  parentChain?: ElementSummary[];
  siblingsSummary?: ElementSummary[];
  childrenSummary?: ElementSummary[];
  formContext?: {
    label?: string;
    placeholder?: string;
    name?: string;
    type?: string;
  };
  interactionState?: {
    hover?: boolean;
    active?: boolean;
    focus?: boolean;
    focusWithin?: boolean;
  };
  computedStyles?: Record<string, string>;
  pseudoElements?: {
    before?: Record<string, string>;
    after?: Record<string, string>;
  };
}

export interface ElementSummary {
  tagName: string;
  selector?: string;
  role?: string;
  text?: string;
  attributes?: Record<string, string>;
}

/**
 * Selection Manager class
 */
export class SelectionManager {
  private box: HTMLElement | null = null;
  private hoveredElement: HTMLElement | null = null;
  private activeElement: HTMLElement | null = null;
  private frameworkAdapter: FrameworkAdapter | null = null;

  constructor(private options: SelectionManagerOptions) {
    this.ensureBox();
  }

  /**
   * Set the framework adapter for component info extraction
   */
  setFrameworkAdapter(adapter: FrameworkAdapter | null): void {
    this.frameworkAdapter = adapter;
  }

  /**
   * Ensure highlight box exists
   */
  private ensureBox(): void {
    if (this.box) return;

    this.box = document.createElement('div');
    this.box.id = this.options.boxId;
    this.box.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #1d4ed8;background:rgba(29,78,216,.08);box-shadow:0 0 0 99999px rgba(15,23,42,.08);display:none';
    document.body.appendChild(this.box);
  }

  /**
   * Update hover state for an element
   */
  updateHover(element: HTMLElement | null): void {
    this.hoveredElement = element;

    if (element) {
      this.highlightElement(element);
    } else {
      this.clearHighlight();
    }

    this.options.onHover?.(element);
  }

  /**
   * Get the currently hovered element
   */
  getHovered(): HTMLElement | null {
    return this.hoveredElement;
  }

  /**
   * Get the currently active (selected) element
   */
  getActive(): HTMLElement | null {
    return this.activeElement;
  }

  /**
   * Set the active element
   */
  setActive(element: HTMLElement | null): void {
    this.activeElement = element;
  }

  /**
   * Highlight an element with the box
   */
  private highlightElement(element: HTMLElement): void {
    if (!this.box) return;

    const rect = element.getBoundingClientRect();
    this.box.style.display = 'block';
    this.box.style.left = `${rect.left + window.scrollX}px`;
    this.box.style.top = `${rect.top + window.scrollY}px`;
    this.box.style.width = `${rect.width}px`;
    this.box.style.height = `${rect.height}px`;
  }

  /**
   * Clear the highlight box
   */
  private clearHighlight(): void {
    if (!this.box) return;
    this.box.style.display = 'none';
  }

  /**
   * Generate a unique selector for an element
   */
  selectorFor(element: HTMLElement): string {
    if (element.id) {
      return `#${this.cssEscape(element.id)}`;
    }

    const parts: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      let tag = current.tagName.toLowerCase();

      if (current.id) {
        tag += `#${this.cssEscape(current.id)}`;
        parts.unshift(tag);
        break;
      }

      if (current.className) {
        const classes = current.className
          .trim()
          .split(/\s+/)
          .filter((c) => c)
          .slice(0, 2)
          .map((c) => this.cssEscape(c));

        if (classes.length > 0) {
          tag += '.' + classes.join('.');
        }
      }

      const parent: HTMLElement | null = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (child): child is HTMLElement => child instanceof HTMLElement && child.tagName === current!.tagName
        );

        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          tag += `:nth-child(${index})`;
        }
      }

      parts.unshift(tag);
      current = parent;
    }

    return parts.join(' > ');
  }

  /**
   * Get element attributes as a record
   */
  attributesFor(element: HTMLElement): Record<string, string> {
    const attrs: Record<string, string> = {};

    for (const attr of Array.from(element.attributes)) {
      if (attr.name === 'style' || attr.name.startsWith('data-')) {
        continue;
      }
      attrs[attr.name] = attr.value;
    }

    return attrs;
  }

  /**
   * Get parent chain for an element
   */
  parentChainFor(element: HTMLElement): ElementSummary[] {
    const chain: ElementSummary[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      const summary = this.elementSummaryFor(current);
      chain.unshift(summary);

      if (chain.length >= 5) {
        break;
      }

      current = current.parentElement;
    }

    return chain;
  }

  /**
   * Get siblings summary for an element
   */
  siblingsFor(element: HTMLElement): ElementSummary[] {
    const parent = element.parentElement;
    if (!parent) return [];

    return Array.from(parent.children)
      .filter((el): el is HTMLElement => el instanceof HTMLElement && el !== element)
      .slice(0, 10)
      .map((el) => this.elementSummaryFor(el));
  }

  /**
   * Get children summary for an element
   */
  childrenFor(element: HTMLElement): ElementSummary[] {
    return Array.from(element.children)
      .slice(0, 10)
      .map((el) => this.elementSummaryFor(el as HTMLElement));
  }

  /**
   * Get accessible name for an element
   */
  accessibleNameFor(element: HTMLElement): string | undefined {
    // Check aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // Check for label element
    if (element.id) {
      const label = document.querySelector(`label[for="${this.cssEscape(element.id)}"]`);
      if (label) {
        return label.textContent?.trim() || undefined;
      }
    }

    // Check for text content in certain elements
    if (['BUTTON', 'A', 'SUMMARY'].includes(element.tagName)) {
      return element.textContent?.trim() || undefined;
    }

    return undefined;
  }

  /**
   * Get form context for an element
   */
  formContextFor(element: HTMLElement): { label?: string; placeholder?: string; name?: string; type?: string } | undefined {
    if (element.tagName !== 'INPUT' && element.tagName !== 'TEXTAREA' && element.tagName !== 'SELECT') {
      return undefined;
    }

    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    return {
      label: this.accessibleNameFor(element),
      placeholder: 'placeholder' in input ? input.placeholder || undefined : undefined,
      name: input.name || undefined,
      type: (input as HTMLInputElement).type || 'text',
    };
  }

  /**
   * Get interaction state for an element
   */
  interactionStateFor(element: HTMLElement): { hover?: boolean; active?: boolean; focus?: boolean; focusWithin?: boolean } {
    return {
      hover: this.hoveredElement === element,
      focus: document.activeElement === element,
      focusWithin: element.contains(document.activeElement),
    };
  }

  /**
   * Get style summary for an element
   */
  styleSummary(element: HTMLElement): Record<string, string> {
    const computed = window.getComputedStyle(element);
    const relevant = ['display', 'position', 'flex-direction', 'grid-template-columns', 'visibility'];

    const summary: Record<string, string> = {};
    for (const prop of relevant) {
      const value = computed.getPropertyValue(prop);
      if (value && value !== 'normal' && value !== 'auto') {
        summary[prop] = value;
      }
    }

    return summary;
  }

  /**
   * Get pseudo element styles
   */
  pseudoSummary(element: HTMLElement, pseudo: '::before' | '::after'): Record<string, string> | undefined {
    const computed = window.getComputedStyle(element, pseudo);
    const content = computed.content;
    const display = computed.display;

    if (content === 'none' || content === '' || display === 'none') {
      return undefined;
    }

    return {
      content,
      display,
      position: computed.position,
    };
  }

  /**
   * Get element context
   */
  elementContextFor(element: HTMLElement): ElementContext {
    return {
      accessibleName: this.accessibleNameFor(element),
      role: element.getAttribute('role') || undefined,
      attributes: this.attributesFor(element),
      parentChain: this.parentChainFor(element),
      siblingsSummary: this.siblingsFor(element),
      childrenSummary: this.childrenFor(element),
      formContext: this.formContextFor(element),
      interactionState: this.interactionStateFor(element),
      computedStyles: this.styleSummary(element),
      pseudoElements: {
        before: this.pseudoSummary(element, '::before'),
        after: this.pseudoSummary(element, '::after'),
      },
    };
  }

  /**
   * Get element summary
   */
  elementSummaryFor(element: HTMLElement): ElementSummary {
    const text = element.textContent?.trim().slice(0, 50) || '';

    return {
      tagName: element.tagName.toLowerCase(),
      selector: this.selectorFor(element),
      role: element.getAttribute('role') || undefined,
      text: text || undefined,
      attributes: this.attributesFor(element),
    };
  }

  /**
   * Get component info using framework adapter
   */
  componentInfoFor(element: HTMLElement): UiInspectComponentInfo | null {
    if (!this.frameworkAdapter) {
      return null;
    }

    const componentInfo = this.frameworkAdapter.getComponentInfo(element);
    if (!componentInfo) {
      return null;
    }

    const chain = this.frameworkAdapter.getComponentChain(element);

    return {
      framework: this.frameworkAdapter.name,
      name: componentInfo.name,
      displayName: componentInfo.displayName,
      file: componentInfo.file,
      instanceId: componentInfo.instanceId,
      hierarchy: chain.map((info: ComponentInfo) => ({
        name: info.name,
        displayName: info.displayName,
        file: info.file,
        instanceId: info.instanceId,
      })),
      props: this.frameworkAdapter.getComponentProps(element),
      state: this.frameworkAdapter.getComponentState(element),
    };
  }

  /**
   * Get source hints using framework adapter
   */
  sourceHintsFor(element: HTMLElement): UiInspectSourceHint[] {
    if (!this.frameworkAdapter) {
      return [];
    }

    return this.frameworkAdapter.getSourceHints(element);
  }

  /**
   * Escape CSS identifiers
   */
  private cssEscape(value: string): string {
    return value.replace(/([^\w-])/g, '\\$1');
  }

  /**
   * Destroy the selection manager
   */
  destroy(): void {
    if (this.box && this.box.parentNode) {
      this.box.parentNode.removeChild(this.box);
    }
    this.box = null;
    this.hoveredElement = null;
    this.activeElement = null;
  }
}
