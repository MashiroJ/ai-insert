export const DEFAULT_DAEMON_PORT = 17321;
export const DEFAULT_DAEMON_URL = `http://127.0.0.1:${DEFAULT_DAEMON_PORT}`;

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

export interface UiInspectSourceHint {
  kind: 'direct' | 'vue-component' | 'dom-attr' | 'style' | 'stack-frame' | 'heuristic';
  file: string | null;
  line: number | null;
  column: number | null;
  confidence: number;
  reason: string;
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

export type UiInspectSessionMode = 'source' | 'single' | 'batch' | 'troubleshoot';

export interface UiInspectSelection {
  id: string;
  sessionId: string;
  url: string;
  title: string;
  timestamp: number;
  instruction: string;
  note?: string;
  framework: 'vue3' | 'dom';
  dom: UiInspectDomSelection;
  vue: UiInspectVueSelection | null;
  source: UiInspectSourceSelection;
  context?: UiInspectElementContext;
  sourceHints?: UiInspectSourceHint[];
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
