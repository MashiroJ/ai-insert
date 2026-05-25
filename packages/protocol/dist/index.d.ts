export declare const DEFAULT_DAEMON_PORT = 17321;
export declare const DEFAULT_DAEMON_URL = "http://127.0.0.1:17321";
/**
 * Supported framework types
 * Extend this type when adding support for new frameworks
 */
export type UiInspectFramework = 'vue3' | 'react' | 'solid' | 'svelte' | 'dom' | 'vanilla' | string;
export interface UiInspectRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface UiInspectDomSelection {
    selector: string;
    tagName: string;
    id: string;
    className: string;
    text: string;
    outerHtml: string;
    rect: UiInspectRect;
    styles: Record<string, string>;
}
export interface UiInspectElementSummary {
    tagName: string;
    selector?: string;
    role?: string;
    text?: string;
    attributes?: Record<string, string>;
}
export interface UiInspectElementContext {
    accessibleName?: string;
    role?: string;
    attributes?: Record<string, string>;
    parentChain?: UiInspectElementSummary[];
    siblingsSummary?: UiInspectElementSummary[];
    childrenSummary?: UiInspectElementSummary[];
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
/**
 * Framework-agnostic component information
 */
export interface UiInspectComponentInfo {
    framework: string;
    name: string;
    displayName?: string;
    file?: string;
    instanceId?: string;
    hierarchy: UiInspectComponentHierarchy[];
    props?: Record<string, unknown>;
    state?: Record<string, unknown> | null;
}
/**
 * Component hierarchy item
 */
export interface UiInspectComponentHierarchy {
    name: string;
    displayName?: string;
    file?: string;
    instanceId?: string;
}
/**
 * Extended source hint with framework support
 */
export interface UiInspectSourceHint {
    kind: 'direct' | 'vue-component' | 'dom-attr' | 'style' | 'stack-frame' | 'heuristic' | 'component-file' | 'template-file' | 'style-file' | 'config-file';
    file: string | null;
    line: number | null;
    column: number | null;
    confidence: number;
    reason: string;
    metadata?: Record<string, unknown>;
}
/**
 * @deprecated Use UiInspectComponentInfo instead for framework-agnostic approach.
 * Kept for backward compatibility.
 */
export interface UiInspectVueSelection {
    componentName: string | null;
    componentChain: string[];
    sourceFile: string | null;
    props: Record<string, string>;
    attrs: Record<string, string>;
}
export interface UiInspectSourceSelection {
    root: string | null;
    file: string | null;
    line: number | null;
    column: number | null;
}
export interface UiInspectRuntimeEvent {
    id: string;
    level: 'warn' | 'error';
    kind: 'console' | 'window-error' | 'unhandledrejection';
    message: string;
    stack?: string;
    timestamp: number;
    url: string;
}
export interface UiInspectDiagnostics {
    runtimeEvents: UiInspectRuntimeEvent[];
    capturedAt: number;
    truncated?: boolean;
}
export type UiInspectSessionMode = 'source' | 'single' | 'batch' | 'troubleshoot' | 'css-debug';
export interface UiInspectSelection {
    id: string;
    sessionId: string;
    url: string;
    title: string;
    timestamp: number;
    instruction: string;
    note?: string;
    /**
     * Framework type - extended to support multiple frameworks
     */
    framework: UiInspectFramework;
    /**
     * DOM selection information (always available)
     */
    dom: UiInspectDomSelection;
    /**
     * Framework-agnostic component information (replaces framework-specific fields)
     */
    component?: UiInspectComponentInfo | null;
    /**
     * @deprecated Use `component` field instead. Kept for backward compatibility.
     */
    vue?: UiInspectVueSelection | null;
    /**
     * Source location information
     */
    source: UiInspectSourceSelection;
    /**
     * Element context (accessibility, hierarchy, etc.)
     */
    context?: UiInspectElementContext;
    /**
     * Source hints for code location
     */
    sourceHints?: UiInspectSourceHint[];
    /**
     * Runtime diagnostics (console errors, window errors, etc.)
     */
    diagnostics?: UiInspectDiagnostics;
}
export interface UiInspectTarget {
    id: string;
    note: string;
    selection: UiInspectSelection;
    context?: UiInspectElementContext;
    sourceHints?: UiInspectSourceHint[];
    diagnostics?: UiInspectDiagnostics;
}
export interface UiInspectCssDebugStyleChange {
    originalValue: string | null;
    previewValue: string | null;
}
export interface UiInspectCssDebugElementSnapshot {
    selector: string;
    tagName: string;
    className: string;
    text: string;
    rect: UiInspectRect;
    styles?: Record<string, string>;
}
export interface UiInspectCssDebugElementEffect {
    selector: string;
    tagName: string;
    className: string;
    text: string;
    beforeRect: UiInspectRect;
    afterRect: UiInspectRect;
    sizeChanged: boolean;
    positionChanged: boolean;
}
export interface UiInspectCssDebugComputedEffects {
    self: Record<string, UiInspectCssDebugStyleChange>;
}
export interface UiInspectCssDebugLayoutContext {
    parent?: UiInspectCssDebugElementSnapshot;
    siblings: UiInspectCssDebugElementEffect[];
    children: UiInspectCssDebugElementEffect[];
}
export interface UiInspectCssDebugInteraction {
    type: 'panel-control' | 'resize' | 'move';
    handle?: 'e' | 's' | 'se' | 'nw' | 'n' | 'ne' | 'w' | 'sw' | 'move';
    properties: string[];
    rectBefore: UiInspectRect;
    rectAfter: UiInspectRect;
    delta: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    strategy: 'inline-style' | 'transform-preview';
    timestamp: number;
}
export interface UiInspectCssDebugSessionInfo {
    id: string;
    url: string;
    title: string;
    root: string | null;
    timestamp: number;
}
export type UiInspectStyleSourceHintKind = 'vue-sfc-style-rule' | 'style-rule' | 'template-class' | 'inline-style' | 'parent-layout-rule' | 'fallback-source';
export interface UiInspectStyleSourceHint {
    id: string;
    targetId: string;
    kind: UiInspectStyleSourceHintKind;
    file: string;
    line: number | null;
    column?: number | null;
    endLine?: number | null;
    selector?: string;
    matchedBy: string[];
    properties: string[];
    confidence: number;
    reason: string;
    snippet?: string;
}
export interface UiInspectCssDebugTarget {
    id: string;
    selection: UiInspectSelection;
    selectedElement: UiInspectDomSelection;
    originalStyles: Record<string, string>;
    originalInlineStyles?: Record<string, string>;
    previewStyles: Record<string, string>;
    changedStyles: Record<string, UiInspectCssDebugStyleChange>;
    computedEffects?: UiInspectCssDebugComputedEffects;
    layoutContext?: UiInspectCssDebugLayoutContext;
    interactions?: UiInspectCssDebugInteraction[];
    primaryInteraction?: UiInspectCssDebugInteraction;
    note?: string;
    sourceHints?: UiInspectSourceHint[];
    styleSourceHints?: UiInspectStyleSourceHint[];
}
export interface UiInspectCssDebugPayload {
    selection: UiInspectSelection;
    selectedElement: UiInspectDomSelection;
    originalStyles: Record<string, string>;
    previewStyles: Record<string, string>;
    changedStyles: Record<string, UiInspectCssDebugStyleChange>;
    batch?: boolean;
    primaryTargetId?: string;
    changedTargetCount?: number;
    targets?: UiInspectCssDebugTarget[];
    computedEffects?: UiInspectCssDebugComputedEffects;
    layoutContext?: UiInspectCssDebugLayoutContext;
    interactions?: UiInspectCssDebugInteraction[];
    primaryInteraction?: UiInspectCssDebugInteraction;
    note?: string;
    sourceHints?: UiInspectSourceHint[];
    styleSourceHints?: UiInspectStyleSourceHint[];
    session: UiInspectCssDebugSessionInfo;
}
export type UiInspectTaskStatus = 'draft' | 'sent' | 'claimed' | 'working' | 'done' | 'failed';
export type UiInspectMessageRole = 'user' | 'assistant';
export interface UiInspectMessage {
    id: string;
    sessionId: string;
    role: UiInspectMessageRole;
    content: string;
    timestamp: number;
    selectionId: string | null;
}
export interface UiInspectSession {
    id: string;
    createdAt: number;
    updatedAt: number;
    status?: UiInspectTaskStatus;
    mode?: UiInspectSessionMode;
    selection: UiInspectSelection | null;
    targets?: UiInspectTarget[];
    diagnostics?: UiInspectDiagnostics;
    cssDebug?: UiInspectCssDebugPayload;
    messages: UiInspectMessage[];
}
export interface UiInspectSelectionResponse {
    active: boolean;
    selection: UiInspectSelection | null;
    session: UiInspectSession | null;
    ageMs: number | null;
}
export interface UiInspectSessionsResponse {
    sessions: UiInspectSession[];
}
export interface UiInspectHealthResponse {
    ok: true;
    name: 'ui-inspect';
    version: string;
}
export interface UiInspectSourceResponse {
    file: string;
    root: string;
    startLine: number;
    endLine: number;
    totalLines: number;
    content: string;
}
