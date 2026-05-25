// Generated browser client source fragment for CSS Debug.
export const cssDebugInteractionClientSource = `
  function beginCssDebugInteraction(event) {
    const target = cssDebugActiveTarget();
    if (!target?.element) return;
    if (cssDebugSession && cssDebugSession.sent) return;
    const handle = event.currentTarget?.getAttribute?.('data-css-debug-handle') || 'move';

    // Resolve scope guard boundary
    const scopeGuard = resolveCssDebugBoundary(target.element);
    target.scopeGuard = scopeGuard;

    // Disable move handle if no boundary found (cannot clamp reliably)
    if (handle === 'move' && !scopeGuard) {
      showToast('未找到可靠边界，禁止自由拖动。请使用控制面板调整。', 'failed');
      return;
    }

    const rect = cssDebugRect(target.element);
    const inlineTransform = target.element.style.getPropertyValue('transform') || '';
    const translate = cssDebugTranslateFromTransform(inlineTransform);
    target.drag = {
      handle,
      rectBefore: rect,
      startX: event.clientX,
      startY: event.clientY,
      width: rect.width,
      height: rect.height,
      transformBase: cssDebugTransformBase(inlineTransform),
      translateX: translate.x,
      translateY: translate.y,
      lastDx: 0,
      lastDy: 0,
      inlineCssTextBeforeDrag: target.element.style.cssText || '',
      previewStylesBeforeDrag: { ...(target.previewStyles || {}) },
      activePropertiesBeforeDrag: new Set(target.activeProperties || []),
      scopeGuard: scopeGuard,
      swapSiblings: handle === 'move' ? findSwappableSiblings(target.element) : [],
      swapTarget: null,
      altKey: event.altKey
    };
    try { event.currentTarget?.setPointerCapture?.(event.pointerId); } catch {}
    document.addEventListener('pointermove', moveCssDebugInteraction, true);
    document.addEventListener('pointerup', endCssDebugInteraction, true);
    document.addEventListener('pointercancel', cancelCssDebugInteraction, true);
    event.preventDefault();
  }

  function moveCssDebugInteraction(event) {
    const target = cssDebugActiveTarget();
    const drag = target?.drag;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    drag.lastDx = dx;
    drag.lastDy = dy;
    const altForceMove = event.altKey;

    // Swap detection for move handle
    if (drag.handle === 'move' && drag.swapSiblings && drag.swapSiblings.length > 0 && !altForceMove) {
      let bestSwap = null;
      let bestOverlap = 0;
      const dragCenterX = drag.rectBefore.x + drag.rectBefore.width / 2 + dx;
      const dragCenterY = drag.rectBefore.y + drag.rectBefore.height / 2 + dy;
      for (const sibling of drag.swapSiblings) {
        const sr = sibling.element.getBoundingClientRect();
        const overlapX = Math.max(0, Math.min(dragCenterX, sr.right) - Math.max(dragCenterX - drag.rectBefore.width * 0.3, sr.left));
        const overlapY = Math.max(0, Math.min(dragCenterY, sr.bottom) - Math.max(dragCenterY - drag.rectBefore.height * 0.3, sr.top));
        const overlap = overlapX * overlapY;
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestSwap = sibling;
        }
      }
      if (bestSwap && bestOverlap > 100) {
        drag.swapTarget = bestSwap;
        showCssDebugSwapOverlay(bestSwap.element, '松手替换');
      } else {
        drag.swapTarget = null;
        hideCssDebugSwapOverlay();
      }
    } else if (drag.handle === 'move' && altForceMove) {
      drag.swapTarget = null;
      hideCssDebugSwapOverlay();
    }

    const panel = cssDebugPanel();
    const h = drag.handle;
    const affectsLeft = h === 'nw' || h === 'w' || h === 'sw';
    const affectsTop = h === 'nw' || h === 'n' || h === 'ne';
    const affectsRight = h === 'ne' || h === 'e' || h === 'se';
    const affectsBottom = h === 'sw' || h === 's' || h === 'se';

    // Apply scope guard clamp if available
    let effectiveDx = dx;
    let effectiveDy = dy;
    let clamped = false;

    if (drag.scopeGuard && drag.scopeGuard.enabled) {
      if (h === 'move') {
        const clampResult = clampMoveInteraction(drag.rectBefore, drag.scopeGuard.rect, dx, dy);
        effectiveDx = clampResult.clampDx;
        effectiveDy = clampResult.clampDy;
        clamped = clampResult.clamped;
        const t = cssDebugActiveTarget();
        if (t?.scopeGuard) t.scopeGuard.clamped = clamped;
        if (clamped) {
          drag.clamped = true;
          drag.clampDelta = { x: clampResult.clampDx - dx, y: clampResult.clampDy - dy, width: 0, height: 0 };
        }
      } else {
        const clampResult = clampResizeInteraction(drag.rectBefore, drag.scopeGuard.rect, h, dx, dy);
        effectiveDx = clampResult.clampDx;
        effectiveDy = clampResult.clampDy;
        clamped = clampResult.clamped;
        drag.clampResult = clampResult;
        const t = cssDebugActiveTarget();
        if (t?.scopeGuard) t.scopeGuard.clamped = clamped;
        if (clamped) {
          drag.clamped = true;
          drag.clampDelta = { x: clampResult.clampDx - dx, y: clampResult.clampDy - dy, width: clampResult.resultWidth - (drag.width + dx), height: clampResult.resultHeight - (drag.height + dy) };
        }
      }
    }

    if (h === 'move') {
      const transform = cssDebugPreviewTransform(drag.transformBase, drag.translateX + effectiveDx, drag.translateY + effectiveDy);
      applyCssDebugValue('transform', transform);
      removeCssDebugPreviewOverlay();
      updateCssDebugBoundaryOverlay(drag.scopeGuard, { clamped, visible: true });
      if (clamped && !drag.clampShown) {
        showToast('已限制在当前组件内，跨组件移动需要修改源码结构。', 'rest');
        drag.clampShown = true;
      }
    } else {
      const cr = drag.clampResult;
      let nextWidth, nextHeight, translateX, translateY, previewDx, previewDy;
      if (cr) {
        nextWidth = Math.max(1, Math.round(cr.resultWidth));
        nextHeight = Math.max(1, Math.round(cr.resultHeight));
        translateX = drag.translateX;
        translateY = drag.translateY;
        if (affectsLeft) {
          translateX = drag.translateX + cr.clampDx;
          previewDx = cr.clampDx;
        } else {
          previewDx = 0;
        }
        if (affectsTop) {
          translateY = drag.translateY + cr.clampDy;
          previewDy = cr.clampDy;
        } else {
          previewDy = 0;
        }
      } else {
        nextWidth = drag.width;
        nextHeight = drag.height;
        previewDx = 0;
        previewDy = 0;
        translateX = drag.translateX;
        translateY = drag.translateY;
        if (affectsRight) {
          nextWidth = Math.max(1, Math.round(drag.width + dx));
        }
        if (affectsLeft) {
          const maxDx = drag.width - 1;
          previewDx = Math.min(dx, maxDx);
          nextWidth = Math.max(1, Math.round(drag.width - previewDx));
          translateX = drag.translateX + previewDx;
        }
        if (affectsBottom) {
          nextHeight = Math.max(1, Math.round(drag.height + dy));
        }
        if (affectsTop) {
          const maxDy = drag.height - 1;
          previewDy = Math.min(dy, maxDy);
          nextHeight = Math.max(1, Math.round(drag.height - previewDy));
          translateY = drag.translateY + previewDy;
        }
      }
      if (affectsRight || affectsLeft) {
        const value = nextWidth + 'px';
        applyCssDebugValue('width', value);
        syncCssDebugControl(panel, 'width', value);
      }
      if (affectsBottom || affectsTop) {
        const value = nextHeight + 'px';
        applyCssDebugValue('height', value);
        syncCssDebugControl(panel, 'height', value);
      }
      if (affectsLeft || affectsTop) {
        const transform = cssDebugPreviewTransform(drag.transformBase, translateX, translateY);
        applyCssDebugValue('transform', transform);
      }
      removeCssDebugPreviewOverlay();
      updateCssDebugBoundaryOverlay(drag.scopeGuard, { clamped, visible: true });
    }
    if (panel) {
      if (cssDebugActiveTarget()?.changedOnly && drag.handle !== 'move') renderCssDebugControls(panel);
      else renderCssDebugDiff(panel);
    }
    event.preventDefault();
  }

  function finishCssDebugInteraction(cancelled) {
    const target = cssDebugActiveTarget();
    const drag = target?.drag;
    if (!drag) return;
    document.removeEventListener('pointermove', moveCssDebugInteraction, true);
    document.removeEventListener('pointerup', endCssDebugInteraction, true);
    document.removeEventListener('pointercancel', cancelCssDebugInteraction, true);
    target.drag = null;
    if (cancelled) {
      hideCssDebugSwapOverlay();
      return;
    }

    // Handle swap/reorder
    if (drag.swapTarget && drag.handle === 'move') {
      hideCssDebugSwapOverlay();
      const sourceEl = target.element;
      const targetEl = drag.swapTarget.element;
      const parent = sourceEl.parentElement;
      if (parent && parent.contains(targetEl)) {
        // Revert only the current drag preview. Keep style edits made before the
        // drag started, but do not leak transform-preview into a reorder payload.
        sourceEl.style.cssText = drag.inlineCssTextBeforeDrag || '';
        target.previewStyles = { ...(drag.previewStylesBeforeDrag || {}) };
        target.activeProperties = new Set(drag.activePropertiesBeforeDrag || []);

        const parentSelector = selectorFor(parent);
        const sourceIndex = Array.from(parent.children).indexOf(sourceEl);
        const targetIndex = drag.swapTarget.index;
        const sourceId = cssDebugElementStableId(sourceEl);
        const targetId = cssDebugElementStableId(targetEl);
        const previousSelectionId = target.selection?.id;
        const previousNote = target.selection?.note || '';

        // Perform DOM swap using a placeholder
        const placeholder = document.createComment('ui-inspect-swap');
        parent.insertBefore(placeholder, sourceEl);
        parent.insertBefore(sourceEl, targetEl);
        parent.insertBefore(targetEl, placeholder);
        parent.removeChild(placeholder);

        // Refresh selection snapshot after swap
        target.selection = selectionPayloadFor(sourceEl, previousNote, activePanelSessionId);
        selectedTargets = selectedTargets.map((item) => (
          item.id === target.id || item.selection?.id === previousSelectionId
            ? targetFromSelection(target.selection, item.note || previousNote || '')
            : item
        ));
        const rectAfterSwap = cssDebugRect(sourceEl);

        const reorderInteraction = {
          type: 'reorder',
          handle: 'move',
          properties: [],
          rectBefore: drag.rectBefore,
          rectAfter: rectAfterSwap,
          delta: { x: 0, y: 0, width: 0, height: 0 },
          strategy: 'swap-sibling',
          timestamp: Date.now(),
          reorder: {
            sourceId: sourceId,
            targetId: targetId,
            sourceIndex: sourceIndex,
            targetIndex: targetIndex,
            parentSelector: parentSelector,
            matchedBy: drag.swapTarget.matchedBy.slice(0, 8)
          }
        };
        target.interactions = [...(target.interactions || []), reorderInteraction].slice(-8);
        target.primaryInteraction = reorderInteraction;
        const panel = cssDebugPanel();
        if (panel) renderCssDebugControls(panel);
        updateCssDebugOverlay();
        updateCssDebugMiniBar();
        showToast('已交换位置: index ' + sourceIndex + ' ↔ ' + targetIndex, 'done');
        return;
      }
    }

    hideCssDebugSwapOverlay();
    const rectAfter = cssDebugRect(target.element);
    const delta = {
      x: Math.round((rectAfter.x - drag.rectBefore.x) * 10) / 10,
      y: Math.round((rectAfter.y - drag.rectBefore.y) * 10) / 10,
      width: Math.round((rectAfter.width - drag.rectBefore.width) * 10) / 10,
      height: Math.round((rectAfter.height - drag.rectBefore.height) * 10) / 10
    };
    const interaction = {
      type: drag.handle === 'move' ? 'move' : 'resize',
      handle: drag.handle,
      properties: drag.handle === 'move' ? ['transform'] : (drag.handle === 'e' ? ['width'] : (drag.handle === 'w' ? ['width', 'transform'] : (drag.handle === 's' ? ['height'] : (drag.handle === 'n' ? ['height', 'transform'] : (drag.handle === 'se' ? ['width', 'height'] : ['width', 'height', 'transform']))))),
      rectBefore: drag.rectBefore,
      rectAfter,
      delta,
      strategy: drag.handle === 'move' || drag.handle === 'nw' || drag.handle === 'w' || drag.handle === 'sw' || drag.handle === 'n' || drag.handle === 'ne' ? 'transform-preview' : 'inline-style',
      timestamp: Date.now(),
      clamped: drag.clamped || undefined,
      clampDelta: drag.clampDelta || undefined,
      scopeGuard: drag.scopeGuard || undefined,
    };
    target.interactions = [...(target.interactions || []), interaction].slice(-8);
    target.primaryInteraction = interaction;
    const panel = cssDebugPanel();
    if (panel) renderCssDebugControls(panel);
    updateCssDebugOverlay();
    updateCssDebugMiniBar();
  }

  function endCssDebugInteraction() {
    finishCssDebugInteraction(false);
  }

  function cancelCssDebugInteraction() {
    finishCssDebugInteraction(true);
  }
`;
