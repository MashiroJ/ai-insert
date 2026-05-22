/**
 * Selection Manager
 *
 * Handles element selection, highlighting, and selector generation.
 */
/**
 * Selection Manager class
 */
export class SelectionManager {
    options;
    box = null;
    hoveredElement = null;
    activeElement = null;
    frameworkAdapter = null;
    constructor(options) {
        this.options = options;
        this.ensureBox();
    }
    /**
     * Set the framework adapter for component info extraction
     */
    setFrameworkAdapter(adapter) {
        this.frameworkAdapter = adapter;
    }
    /**
     * Ensure highlight box exists
     */
    ensureBox() {
        if (this.box)
            return;
        this.box = document.createElement('div');
        this.box.id = this.options.boxId;
        this.box.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #1d4ed8;background:rgba(29,78,216,.08);box-shadow:0 0 0 99999px rgba(15,23,42,.08);display:none';
        document.body.appendChild(this.box);
    }
    /**
     * Update hover state for an element
     */
    updateHover(element) {
        this.hoveredElement = element;
        if (element) {
            this.highlightElement(element);
        }
        else {
            this.clearHighlight();
        }
        this.options.onHover?.(element);
    }
    /**
     * Get the currently hovered element
     */
    getHovered() {
        return this.hoveredElement;
    }
    /**
     * Get the currently active (selected) element
     */
    getActive() {
        return this.activeElement;
    }
    /**
     * Set the active element
     */
    setActive(element) {
        this.activeElement = element;
    }
    /**
     * Highlight an element with the box
     */
    highlightElement(element) {
        if (!this.box)
            return;
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
    clearHighlight() {
        if (!this.box)
            return;
        this.box.style.display = 'none';
    }
    /**
     * Generate a unique selector for an element
     */
    selectorFor(element) {
        if (element.id) {
            return `#${this.cssEscape(element.id)}`;
        }
        const parts = [];
        let current = element;
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
            const parent = current.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter((child) => child instanceof HTMLElement && child.tagName === current.tagName);
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
    attributesFor(element) {
        const attrs = {};
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
    parentChainFor(element) {
        const chain = [];
        let current = element;
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
    siblingsFor(element) {
        const parent = element.parentElement;
        if (!parent)
            return [];
        return Array.from(parent.children)
            .filter((el) => el instanceof HTMLElement && el !== element)
            .slice(0, 10)
            .map((el) => this.elementSummaryFor(el));
    }
    /**
     * Get children summary for an element
     */
    childrenFor(element) {
        return Array.from(element.children)
            .slice(0, 10)
            .map((el) => this.elementSummaryFor(el));
    }
    /**
     * Get accessible name for an element
     */
    accessibleNameFor(element) {
        // Check aria-label
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel)
            return ariaLabel;
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
    formContextFor(element) {
        if (element.tagName !== 'INPUT' && element.tagName !== 'TEXTAREA' && element.tagName !== 'SELECT') {
            return undefined;
        }
        const input = element;
        return {
            label: this.accessibleNameFor(element),
            placeholder: 'placeholder' in input ? input.placeholder || undefined : undefined,
            name: input.name || undefined,
            type: input.type || 'text',
        };
    }
    /**
     * Get interaction state for an element
     */
    interactionStateFor(element) {
        return {
            hover: this.hoveredElement === element,
            focus: document.activeElement === element,
            focusWithin: element.contains(document.activeElement),
        };
    }
    /**
     * Get style summary for an element
     */
    styleSummary(element) {
        const computed = window.getComputedStyle(element);
        const relevant = ['display', 'position', 'flex-direction', 'grid-template-columns', 'visibility'];
        const summary = {};
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
    pseudoSummary(element, pseudo) {
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
    elementContextFor(element) {
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
    elementSummaryFor(element) {
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
    componentInfoFor(element) {
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
            hierarchy: chain.map((info) => ({
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
    sourceHintsFor(element) {
        if (!this.frameworkAdapter) {
            return [];
        }
        return this.frameworkAdapter.getSourceHints(element);
    }
    /**
     * Escape CSS identifiers
     */
    cssEscape(value) {
        return value.replace(/([^\w-])/g, '\\$1');
    }
    /**
     * Destroy the selection manager
     */
    destroy() {
        if (this.box && this.box.parentNode) {
            this.box.parentNode.removeChild(this.box);
        }
        this.box = null;
        this.hoveredElement = null;
        this.activeElement = null;
    }
}
//# sourceMappingURL=selection-manager.js.map