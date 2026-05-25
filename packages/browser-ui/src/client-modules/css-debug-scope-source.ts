// Generated browser client source fragment for CSS Debug.
export const cssDebugScopeClientSource = String.raw`
  function resolveCssDebugBoundary(el) {
    if (!el || !el.getBoundingClientRect) return null;
    let current = el.parentElement;
    while (current && current !== document.body) {
      if (current.hasAttribute && current.hasAttribute('data-component')) {
        const rect = cssDebugRect(current);
        if (rect.width > 0 && rect.height > 0) {
          return {
            enabled: true,
            boundaryType: 'component',
            boundarySelector: selectorFor(current),
            componentName: current.getAttribute('data-component') || current.tagName.toLowerCase(),
            rect: rect
          };
        }
      }
      const tagName = current.tagName.toLowerCase();
      if (tagName.includes('-')) {
        const rect = cssDebugRect(current);
        if (rect.width > 0 && rect.height > 0) {
          return {
            enabled: true,
            boundaryType: 'component',
            boundarySelector: selectorFor(current),
            componentName: tagName,
            rect: rect
          };
        }
      }
      current = current.parentElement;
    }
    current = el.parentElement;
    while (current && current !== document.body) {
      const styles = window.getComputedStyle(current);
      const hasExplicitSize = (styles.width && styles.width !== 'auto' && styles.width !== '') ||
                             (styles.height && styles.height !== 'auto' && styles.height !== '') ||
                             styles.position === 'relative' ||
                             styles.position === 'absolute';
      if (hasExplicitSize) {
        const rect = cssDebugRect(current);
        if (rect.width > 0 && rect.height > 0) {
          return {
            enabled: true,
            boundaryType: 'container',
            boundarySelector: selectorFor(current),
            rect: rect
          };
        }
      }
      current = current.parentElement;
    }
    const parent = el.parentElement;
    if (parent) {
      const rect = cssDebugRect(parent);
      if (rect.width > 0 && rect.height > 0) {
        return {
          enabled: true,
          boundaryType: 'parent',
          boundarySelector: selectorFor(parent),
          rect: rect
        };
      }
    }
    return null;
  }

  function clampRectToBoundary(rect, boundary) {
    let clamped = false;
    const clampDelta = { x: 0, y: 0, width: 0, height: 0 };
    let width = Math.max(1, rect.width);
    let height = Math.max(1, rect.height);
    if (width > boundary.width) {
      width = boundary.width;
      clampDelta.width = width - rect.width;
      clamped = true;
    }
    if (height > boundary.height) {
      height = boundary.height;
      clampDelta.height = height - rect.height;
      clamped = true;
    }
    let x = rect.x;
    if (x < boundary.x) {
      x = boundary.x;
      clampDelta.x = boundary.x - rect.x;
      clamped = true;
    }
    let y = rect.y;
    if (y < boundary.y) {
      y = boundary.y;
      clampDelta.y = boundary.y - rect.y;
      clamped = true;
    }
    var right = x + width;
    var boundaryRight = boundary.x + boundary.width;
    if (right > boundaryRight) {
      x = boundaryRight - width;
      if (x < boundary.x) x = boundary.x;
      clampDelta.x = x - rect.x;
      clamped = true;
    }
    var bottom = y + height;
    var boundaryBottom = boundary.y + boundary.height;
    if (bottom > boundaryBottom) {
      y = boundaryBottom - height;
      if (y < boundary.y) y = boundary.y;
      clampDelta.y = y - rect.y;
      clamped = true;
    }
    return {
      clamped: clamped,
      result: { x: x, y: y, width: width, height: height },
      clampDelta: clamped ? clampDelta : undefined
    };
  }

  function clampMoveInteraction(elementRect, boundary, dx, dy) {
    const proposedX = elementRect.x + dx;
    const proposedY = elementRect.y + dy;
    const clampResult = clampRectToBoundary({
      x: proposedX,
      y: proposedY,
      width: elementRect.width,
      height: elementRect.height
    }, boundary);
    if (clampResult.clamped && clampResult.clampDelta) {
      return {
        clamped: true,
        clampDx: dx + clampResult.clampDelta.x,
        clampDy: dy + clampResult.clampDelta.y
      };
    }
    return {
      clamped: false,
      clampDx: dx,
      clampDy: dy
    };
  }

  function clampResizeInteraction(elementRect, boundary, handle, dx, dy) {
    const affectsLeft = handle === 'nw' || handle === 'w' || handle === 'sw';
    const affectsTop = handle === 'nw' || handle === 'n' || handle === 'ne';
    const affectsRight = handle === 'ne' || handle === 'e' || handle === 'se';
    const affectsBottom = handle === 'sw' || handle === 's' || handle === 'se';
    let clamped = false;
    let resultWidth, resultX, clampDx = dx;
    if (affectsRight) {
      resultWidth = elementRect.width + dx;
      const maxRight = boundary.x + boundary.width;
      if (elementRect.x + resultWidth > maxRight) {
        resultWidth = maxRight - elementRect.x;
        clamped = true;
      }
      if (resultWidth < 1) {
        resultWidth = 1;
        clamped = true;
      }
      clampDx = resultWidth - elementRect.width;
    } else if (affectsLeft) {
      const fixedRight = elementRect.x + elementRect.width;
      let nextX = elementRect.x + dx;
      if (nextX < boundary.x) { nextX = boundary.x; clamped = true; }
      if (nextX > fixedRight - 1) { nextX = fixedRight - 1; clamped = true; }
      const nextWidth = Math.max(1, fixedRight - nextX);
      resultWidth = nextWidth;
      resultX = nextX;
      clampDx = nextX - elementRect.x;
    } else {
      resultWidth = elementRect.width;
    }
    let resultHeight, resultY, clampDy = dy;
    if (affectsBottom) {
      resultHeight = elementRect.height + dy;
      const maxBottom = boundary.y + boundary.height;
      if (elementRect.y + resultHeight > maxBottom) {
        resultHeight = maxBottom - elementRect.y;
        clamped = true;
      }
      if (resultHeight < 1) {
        resultHeight = 1;
        clamped = true;
      }
      clampDy = resultHeight - elementRect.height;
    } else if (affectsTop) {
      const fixedBottom = elementRect.y + elementRect.height;
      let nextY = elementRect.y + dy;
      if (nextY < boundary.y) { nextY = boundary.y; clamped = true; }
      if (nextY > fixedBottom - 1) { nextY = fixedBottom - 1; clamped = true; }
      const nextHeight = Math.max(1, fixedBottom - nextY);
      resultHeight = nextHeight;
      resultY = nextY;
      clampDy = nextY - elementRect.y;
    } else {
      resultHeight = elementRect.height;
    }
    return {
      clamped: clamped,
      clampDx: clampDx,
      clampDy: clampDy,
      resultWidth: resultWidth,
      resultHeight: resultHeight,
      resultX: affectsLeft ? resultX : undefined,
      resultY: affectsTop ? resultY : undefined
    };
  }
`;
