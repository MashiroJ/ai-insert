// Generated browser client source fragment for CSS Debug.
export const cssDebugTargetSessionClientSource = `
  function closeCssDebugPickPopover() {
    const popover = document.getElementById(CSS_DEBUG_PICK_POPOVER_ID);
    if (popover) popover.remove();
    cssDebugPendingPick = null;
  }

  function restoreCssDebugTargetsBeforeReplace() {
    if (!cssDebugSession) return;
    for (const target of cssDebugSession.targets.values()) {
      if (target.element) target.element.style.cssText = target.originalInlineCssText || '';
    }
    cssDebugSession.targets.clear();
    selectedTargets = [];
    removeCssDebugOverlay();
  }

  function placeCssDebugPickPopover(popover, element) {
    const rect = element.getBoundingClientRect();
    const width = popover.offsetWidth || 232;
    const height = popover.offsetHeight || 40;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.right + 8));
    const top = Math.max(8, Math.min(window.innerHeight - height - 8, rect.top - 4));
    popover.style.left = Math.round(left) + 'px';
    popover.style.top = Math.round(top) + 'px';
  }

  function openCssDebugPickPopover(element, sessionId) {
    if (!element || !cssDebugSession) return;
    closeCssDebugFloatingPanels();
    closeCssDebugPickPopover();
    cssDebugPendingPick = { element, sessionId };
    const popover = document.createElement('div');
    popover.id = CSS_DEBUG_PICK_POPOVER_ID;
    popover.innerHTML = [
      '<span>' + escapeHtml(describeSelection(selectionPayloadFor(element, '', activePanelSessionId))) + '</span>',
      '<button type="button" data-pick-action="add" data-primary="true">添加</button>',
      '<button type="button" data-pick-action="replace">替换</button>',
      '<button type="button" data-pick-action="close" aria-label="关闭">×</button>'
    ].join('');
    document.body.appendChild(popover);
    ['pointerdown','mousedown','mouseup','click','dblclick','mousemove'].forEach((type) => {
      popover.addEventListener(type, (event) => event.stopPropagation());
    });
    popover.querySelector('[data-pick-action="add"]').addEventListener('click', () => {
      const pending = cssDebugPendingPick;
      closeCssDebugPickPopover();
      if (!pending || !cssDebugSession) return;
      cssDebugSession.pickMode = 'append';
      openCssDebugPanel(pending.element, pending.sessionId);
    });
    popover.querySelector('[data-pick-action="replace"]').addEventListener('click', () => {
      const pending = cssDebugPendingPick;
      closeCssDebugPickPopover();
      if (!pending || !cssDebugSession) return;
      restoreCssDebugTargetsBeforeReplace();
      cssDebugSession.pickMode = 'replace-now';
      openCssDebugPanel(pending.element, pending.sessionId);
    });
    popover.querySelector('[data-pick-action="close"]').addEventListener('click', () => {
      closeCssDebugPickPopover();
      updateCssDebugOverlay();
    });
    placeCssDebugPickPopover(popover, element);
    highlightElement(element);
  }

  /**
   * Resolve the best editable target for a raw clicked element.
   * Uses smart heuristic to walk up from leaf/inline nodes to meaningful containers.
   * Holding Alt/Option forces exact element selection.
   */
  function resolveCssDebugEditableTarget(rawElement, event) {
    if (!rawElement || !rawElement.getBoundingClientRect) return null;
    // Alt/Option forces exact selection
    if (event && event.altKey) return rawElement;
    // Use the existing smart target heuristic
    return cssDebugSmartTargetElement(rawElement);
  }

  /**
   * Handle a click on the page while CSS Debug session is active.
   * - If clicked element is already a target, switch to it.
   * - If it's a new editable element, add it as a target.
   * - Ignores clicks on our own UI elements.
   * - Ignores mouseup after drag interactions.
   */
  function handleCssDebugPageClick(event) {
    if (!cssDebugSession || cssDebugSession.sent) return;
    if (cssDebugSession._pendingDragUp) {
      cssDebugSession._pendingDragUp = false;
      return;
    }
    var element = elementFromNode(event.target);
    if (!element || isOwnNode(element)) return;
    if (element.closest && element.closest('#' + CSS_DEBUG_OVERLAY_ID)) return;

    var resolved = resolveCssDebugEditableTarget(element, event);
    if (!resolved) return;

    var stableKey = cssDebugElementKey(resolved);
    var existingTarget = cssDebugSession.targets.get(stableKey);

    if (existingTarget) {
      cssDebugSession.activeTargetId = stableKey;
      cssDebugSession.pickMode = 'replace';
      activeElement = existingTarget.element;
      highlightElement(existingTarget.element);
      updateCssDebugMiniBar();
      updateCssDebugOverlay();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    cssDebugSession.pickMode = 'append';
    openCssDebugPanel(resolved, activePanelSessionId);
    event.preventDefault();
    event.stopPropagation();
  }

  function openCssDebugPanel(element, sessionId) {
    element = cssDebugSmartTargetElement(elementFromNode(element));
    if (!element) return;
    const isNewSession = !cssDebugSession;
    if (!cssDebugSession) {
      removePanel();
      activeTaskMode = 'css-debug';
      activePanelSessionId = sessionId || activePanelSessionId || 'session-' + Date.now();
    }
    activeElement = element;
    const selection = selectionPayloadFor(element, '', activePanelSessionId);
    const stableKey = cssDebugElementKey(element);
    const existingTarget = cssDebugSession ? cssDebugSession.targets.get(stableKey) : null;
    if (existingTarget) {
      cssDebugSession.activeTargetId = stableKey;
      cssDebugSession.pickMode = 'replace';
      activeElement = existingTarget.element;
      highlightElement(existingTarget.element);
      updateCssDebugMiniBar();
      updateCssDebugOverlay();
      return;
    }
    const appendMode = cssDebugSession?.pickMode === 'append';
    const replaceNow = cssDebugSession?.pickMode === 'replace-now';
    if (cssDebugSession && !appendMode && !replaceNow) {
      openCssDebugPickPopover(element, sessionId);
      return;
    }
    if (cssDebugSession && !appendMode) {
      cssDebugSession.targets.clear();
      selectedTargets = [];
    }
    const target = {
      id: stableKey,
      element,
      selection,
      originalInlineCssText: element.style.cssText || '',
      originalInlineStyles: cssDebugInlineStyles(element),
      originalStyles: cssDebugComputedStyles(element),
      previewStyles: {},
      activeProperties: new Set(),
      changedOnly: false,
      originalLayout: cssDebugLayoutSnapshot(element),
      interactions: [],
      primaryInteraction: null,
      drag: null,
      previewRect: null,
      showBoxModel: false,
      scopeGuard: resolveCssDebugBoundary(element)
    };
    if (!cssDebugSession) {
      cssDebugSession = {
        activeTargetId: stableKey,
        targets: new Map([[stableKey, target]]),
        pickMode: 'replace',
        sessionInfo: {
          id: activePanelSessionId,
          url: location.href,
          title: document.title,
          root: PROJECT_ROOT,
          timestamp: Date.now()
        }
      };
      selectedTargets = [targetFromSelection(selection, '')];
    } else {
      cssDebugSession.targets.set(stableKey, target);
      cssDebugSession.activeTargetId = stableKey;
      cssDebugSession.pickMode = 'replace';
      if (appendMode) selectedTargets.push(targetFromSelection(selection, ''));
      else selectedTargets = [targetFromSelection(selection, '')];
    }
    highlightElement(element);
    document.documentElement.setAttribute('data-ui-inspect-css-debug', 'true');
    if (isNewSession) {
      renderCssDebugMiniBar();
    } else {
      updateCssDebugMiniBar();
    }
    updateCssDebugOverlay();
  }
`;
