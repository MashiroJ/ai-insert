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

export interface UiInspectSelection {
  id: string;
  sessionId: string;
  url: string;
  title: string;
  timestamp: number;
  instruction: string;
  framework: 'vue3' | 'dom';
  dom: UiInspectDomSelection;
  vue: UiInspectVueSelection | null;
  source: UiInspectSourceSelection;
}

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
  selection: UiInspectSelection | null;
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
