/**
 * Selector utilities for DOM element inspection
 */
/**
 * Calculate CSS selector specificity
 */
export function calculateSpecificity(selector) {
    const result = {
        ids: 0,
        classes: 0,
        attributes: 0,
        elements: 0,
        pseudoClasses: 0,
        total: 0,
    };
    // Remove pseudo-elements (::before, ::after)
    const cleanSelector = selector.replace(/::[a-z-]+/gi, '');
    // Count IDs (#id)
    result.ids = (cleanSelector.match(/#/g) || []).length;
    // Count classes (.class)
    result.classes = (cleanSelector.match(/\./g) || []).length;
    // Count attributes ([attr], [attr=value])
    result.attributes = (cleanSelector.match(/\[[^\]]+\]/g) || []).length;
    // Count pseudo-classes (:hover, :not, etc.)
    result.pseudoClasses = (cleanSelector.match(/:[a-z-]+(\([^)]*\))?/gi) || []).length;
    // Count element names (simplified - counts non-special characters)
    const parts = cleanSelector.split(/[.#\[\]:>\s+~]/);
    result.elements = parts.filter((p) => p && /^[a-z][a-z0-9-]*$/i.test(p)).length;
    // Calculate total using CSS specificity rules
    result.total = result.ids * 100 + result.classes * 10 + result.elements;
    return result;
}
/**
 * Generate a unique selector for an element
 */
export function generateUniqueSelector(element) {
    if (element.id) {
        return `#${element.id}`;
    }
    const path = [];
    let current = element;
    while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        if (current.id) {
            selector += `#${current.id}`;
            path.unshift(selector);
            break;
        }
        if (current.className) {
            const classes = current.className
                .trim()
                .split(/\s+/)
                .filter((c) => c)
                .slice(0, 2); // Limit to 2 classes
            if (classes.length > 0) {
                selector += '.' + classes.join('.');
            }
        }
        // Add nth-child if needed for uniqueness
        const parentElement = current.parentElement;
        if (parentElement) {
            const siblings = Array.from(parentElement.children).filter((child) => child instanceof HTMLElement && child.tagName === current.tagName);
            if (siblings.length > 1) {
                const index = siblings.indexOf(current) + 1;
                selector += `:nth-child(${index})`;
            }
        }
        path.unshift(selector);
        current = parentElement;
    }
    return path.join(' > ');
}
/**
 * Compare two selectors by specificity
 */
export function compareSpecificity(sel1, sel2) {
    const spec1 = calculateSpecificity(sel1);
    const spec2 = calculateSpecificity(sel2);
    if (spec1.ids !== spec2.ids) {
        return spec1.ids - spec2.ids;
    }
    if (spec1.classes !== spec2.classes) {
        return spec1.classes - spec2.classes;
    }
    return spec1.elements - spec2.elements;
}
/**
 * Check if a selector matches an element
 */
export function matchesSelector(element, selector) {
    try {
        return element.matches(selector);
    }
    catch {
        // Invalid selector
        return false;
    }
}
/**
 * Find the closest ancestor matching a selector
 */
export function closestAncestor(element, selector) {
    let current = element;
    while (current) {
        if (matchesSelector(current, selector)) {
            return current;
        }
        current = current.parentElement;
    }
    return null;
}
/**
 * Generate a data selector attribute if element has data attributes
 */
export function getDataSelector(element) {
    const dataAttrs = Array.from(element.attributes)
        .filter((attr) => attr.name.startsWith('data-') && attr.name !== 'data-ui-inspect')
        .slice(0, 1); // Only use one data attribute
    if (dataAttrs.length === 0) {
        return null;
    }
    const attr = dataAttrs[0];
    const name = attr.name.replace(/^data-/, '');
    const value = attr.value;
    if (value) {
        return `[data-${name}="${value}"]`;
    }
    return `[data-${name}]`;
}
//# sourceMappingURL=selector.js.map