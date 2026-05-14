export const DEFAULT_DAEMON_PORT = 17321;
export const DEFAULT_DAEMON_URL = `http://127.0.0.1:${DEFAULT_DAEMON_PORT}`;

export interface AiInspectRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AiInspectDomSelection {
  selector: string;
  tagName: string;
  id: string;
  className: string;
  text: string;
  outerHtml: string;
  rect: AiInspectRect;
  styles: Record<string, string>;
}

export interface AiInspectVueSelection {
  componentName: string | null;
  componentChain: string[];
  sourceFile: string | null;
  props: Record<string, string>;
  attrs: Record<string, string>;
}

export interface AiInspectSourceSelection {
  root: string | null;
  file: string | null;
  line: number | null;
  column: number | null;
}

export interface AiInspectSelection {
  id: string;
  sessionId: string;
  url: string;
  title: string;
  timestamp: number;
  instruction: string;
  framework: 'vue3' | 'dom';
  dom: AiInspectDomSelection;
  vue: AiInspectVueSelection | null;
  source: AiInspectSourceSelection;
}

export type AiInspectMessageRole = 'user' | 'assistant';

export interface AiInspectMessage {
  id: string;
  sessionId: string;
  role: AiInspectMessageRole;
  content: string;
  timestamp: number;
  selectionId: string | null;
}

export interface AiInspectSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  selection: AiInspectSelection | null;
  messages: AiInspectMessage[];
}

export interface AiInspectSelectionResponse {
  active: boolean;
  selection: AiInspectSelection | null;
  session: AiInspectSession | null;
  ageMs: number | null;
}

export interface AiInspectSessionsResponse {
  sessions: AiInspectSession[];
}

export interface AiInspectHealthResponse {
  ok: true;
  name: 'ai-inspect';
  version: string;
}

export interface AiInspectSourceResponse {
  file: string;
  root: string;
  startLine: number;
  endLine: number;
  totalLines: number;
  content: string;
}
