/**
 * CSS Debug Scope Guard - Movement boundary constraints
 *
 * Simple first version:
 * - Priority: component root → stable parent container → direct parent
 * - If no reliable boundary found: disable free drag
 * - No fallback to viewport
 */
/**
 * Find the nearest stable boundary element for CSS Debug constraints
 * Priority: component root → stable container → parent → none
 */
export function resolveCssDebugBoundary(element) {
    if (!element || !element.getBoundingClientRect) {
        return null;
    }
    // Try to find component root (data-component attribute or framework-specific markers)
    const componentRoot = findComponentRoot(element);
    if (componentRoot) {
        const rect = getSafeRect(componentRoot);
        if (rect && isRectValid(rect)) {
            return {
                enabled: true,
                boundaryType: 'component',
                boundarySelector: selectorFor(componentRoot),
                componentName: componentRoot.getAttribute('data-component') || componentRoot.tagName.toLowerCase(),
                rect,
            };
        }
    }
    // Try to find a stable parent container with explicit dimensions
    const stableContainer = findStableContainer(element);
    if (stableContainer) {
        const rect = getSafeRect(stableContainer);
        if (rect && isRectValid(rect)) {
            return {
                enabled: true,
                boundaryType: 'container',
                boundarySelector: selectorFor(stableContainer),
                rect,
            };
        }
    }
    // Fall back to direct parent
    const parent = element.parentElement;
    if (parent) {
        const rect = getSafeRect(parent);
        if (rect && isRectValid(rect)) {
            return {
                enabled: true,
                boundaryType: 'parent',
                boundarySelector: selectorFor(parent),
                rect,
            };
        }
    }
    // No reliable boundary found - disable free drag
    return null;
}
/**
 * Clamp a rect to stay within boundary
 */
export function clampRectToBoundary(rect, boundary) {
    let clamped = false;
    const clampDelta = { x: 0, y: 0, width: 0, height: 0 };
    // Clamp width if element is larger than boundary
    let width = Math.max(1, rect.width);
    if (width > boundary.width) {
        width = boundary.width;
        clampDelta.width = width - rect.width;
        clamped = true;
    }
    // Clamp height if element is larger than boundary
    let height = Math.max(1, rect.height);
    if (height > boundary.height) {
        height = boundary.height;
        clampDelta.height = height - rect.height;
        clamped = true;
    }
    // Clamp left edge
    let x = rect.x;
    if (x < boundary.x) {
        x = boundary.x;
        clampDelta.x = boundary.x - rect.x;
        clamped = true;
    }
    // Clamp top edge
    let y = rect.y;
    if (y < boundary.y) {
        y = boundary.y;
        clampDelta.y = boundary.y - rect.y;
        clamped = true;
    }
    // Clamp right edge (after left clamp and width clamp)
    const right = x + width;
    const boundaryRight = boundary.x + boundary.width;
    if (right > boundaryRight) {
        x = boundaryRight - width;
        if (x < boundary.x)
            x = boundary.x;
        clampDelta.x = x - rect.x;
        clamped = true;
    }
    // Clamp bottom edge (after top clamp and height clamp)
    const bottom = y + height;
    const boundaryBottom = boundary.y + boundary.height;
    if (bottom > boundaryBottom) {
        y = boundaryBottom - height;
        if (y < boundary.y)
            y = boundary.y;
        clampDelta.y = y - rect.y;
        clamped = true;
    }
    return {
        clamped,
        result: { x, y, width, height },
        clampDelta: clamped ? clampDelta : undefined,
    };
}
/**
 * Clamp move interaction delta
 */
export function clampMoveInteraction(elementRect, boundary, dx, dy) {
    const proposedX = elementRect.x + dx;
    const proposedY = elementRect.y + dy;
    const clampResult = clampRectToBoundary({
        x: proposedX,
        y: proposedY,
        width: elementRect.width,
        height: elementRect.height,
    }, boundary);
    if (clampResult.clamped && clampResult.clampDelta) {
        return {
            clamped: true,
            clampDx: dx + clampResult.clampDelta.x,
            clampDy: dy + clampResult.clampDelta.y,
        };
    }
    return {
        clamped: false,
        clampDx: dx,
        clampDy: dy,
    };
}
/**
 * Clamp resize interaction
 */
export function clampResizeInteraction(elementRect, boundary, handle, dx, dy) {
    const affectsLeft = handle === 'nw' || handle === 'w' || handle === 'sw';
    const affectsTop = handle === 'nw' || handle === 'n' || handle === 'ne';
    const affectsRight = handle === 'ne' || handle === 'e' || handle === 'se';
    const affectsBottom = handle === 'sw' || handle === 's' || handle === 'se';
    let clamped = false;
    // ---- Horizontal (width) ----
    let resultWidth;
    let resultX;
    let clampDx = dx;
    if (affectsRight) {
        // Right edge moves: x stays, width = original + dx
        resultWidth = elementRect.width + dx;
        // Clamp: right edge cannot exceed boundary right
        const maxRight = boundary.x + boundary.width;
        const currentRight = elementRect.x + resultWidth;
        if (currentRight > maxRight) {
            resultWidth = maxRight - elementRect.x;
            clamped = true;
        }
        if (resultWidth < 1) {
            resultWidth = 1;
            clamped = true;
        }
        clampDx = resultWidth - elementRect.width;
    }
    else if (affectsLeft) {
        // Right edge is fixed, left edge moves by dx.
        // fixedRight = elementRect.x + elementRect.width
        // nextX = clamp(origX + dx, boundary.x, fixedRight - 1)
        // nextWidth = fixedRight - nextX
        const fixedRight = elementRect.x + elementRect.width;
        let nextX = elementRect.x + dx;
        if (nextX < boundary.x) {
            nextX = boundary.x;
            clamped = true;
        }
        if (nextX > fixedRight - 1) {
            nextX = fixedRight - 1;
            clamped = true;
        }
        const nextWidth = Math.max(1, fixedRight - nextX);
        resultWidth = nextWidth;
        resultX = nextX;
        clampDx = nextX - elementRect.x;
    }
    else {
        resultWidth = elementRect.width;
    }
    // ---- Vertical (height) ----
    let resultHeight;
    let resultY;
    let clampDy = dy;
    if (affectsBottom) {
        resultHeight = elementRect.height + dy;
        const maxBottom = boundary.y + boundary.height;
        const currentBottom = elementRect.y + resultHeight;
        if (currentBottom > maxBottom) {
            resultHeight = maxBottom - elementRect.y;
            clamped = true;
        }
        if (resultHeight < 1) {
            resultHeight = 1;
            clamped = true;
        }
        clampDy = resultHeight - elementRect.height;
    }
    else if (affectsTop) {
        // Bottom edge is fixed, top edge moves by dy.
        const fixedBottom = elementRect.y + elementRect.height;
        let nextY = elementRect.y + dy;
        if (nextY < boundary.y) {
            nextY = boundary.y;
            clamped = true;
        }
        if (nextY > fixedBottom - 1) {
            nextY = fixedBottom - 1;
            clamped = true;
        }
        const nextHeight = Math.max(1, fixedBottom - nextY);
        resultHeight = nextHeight;
        resultY = nextY;
        clampDy = nextY - elementRect.y;
    }
    else {
        resultHeight = elementRect.height;
    }
    return {
        clamped,
        clampDx,
        clampDy,
        resultWidth,
        resultHeight,
        resultX: affectsLeft ? resultX : undefined,
        resultY: affectsTop ? resultY : undefined,
    };
}
// Helper functions
function findComponentRoot(element) {
    // Start from parent — if the element itself is a component root,
    // we want the parent component/container as boundary, not itself.
    let current = element.parentElement;
    while (current && current !== document.body) {
        // Check for data-component attribute (common pattern)
        if (current.hasAttribute && current.hasAttribute('data-component')) {
            return current;
        }
        // Check for framework-specific markers
        const tagName = current.tagName.toLowerCase();
        if (tagName.includes('-') && !isStandardHtmlTag(tagName)) {
            // Likely a web component or custom element
            return current;
        }
        current = current.parentElement;
    }
    return null;
}
function findStableContainer(element) {
    let current = element.parentElement;
    while (current && current !== document.body) {
        const styles = window.getComputedStyle(current);
        const hasExplicitSize = (styles.width && styles.width !== 'auto' && styles.width !== '') ||
            (styles.height && styles.height !== 'auto' && styles.height !== '') ||
            styles.position === 'relative' ||
            styles.position === 'absolute';
        if (hasExplicitSize) {
            const rect = current.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                return current;
            }
        }
        current = current.parentElement;
    }
    return null;
}
function getSafeRect(element) {
    try {
        const rect = element.getBoundingClientRect();
        return {
            x: Math.round(rect.x * 10) / 10,
            y: Math.round(rect.y * 10) / 10,
            width: Math.round(rect.width * 10) / 10,
            height: Math.round(rect.height * 10) / 10,
        };
    }
    catch {
        return null;
    }
}
function isRectValid(rect) {
    if (!rect)
        return false;
    return rect.width > 0 && rect.height > 0;
}
function isStandardHtmlTag(tagName) {
    const standardTags = new Set([
        'div', 'span', 'p', 'a', 'img', 'button', 'input', 'form',
        'header', 'nav', 'main', 'footer', 'section', 'article', 'aside',
        'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    ]);
    return standardTags.has(tagName);
}
function selectorFor(element) {
    if (element.id) {
        return '#' + element.id;
    }
    if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/).filter(Boolean);
        if (classes.length > 0) {
            return element.tagName.toLowerCase() + '.' + classes[0];
        }
    }
    return element.tagName.toLowerCase();
}
//# sourceMappingURL=css-debug-scope.js.map