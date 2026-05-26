import type { UiInspectCssDebugTarget, UiInspectCssDebugPayload } from '@ui-inspect/protocol';

export interface CssRule {
  selector: string;
  startLine: number;
  endLine: number;
  properties: string[];
  snippet: string;
}

export interface VueSfcBlock {
  tag: 'template' | 'style';
  lang?: string;
  scoped?: boolean;
  startLine: number;
  endLine: number;
  content: string;
}

export interface CandidateFile {
  absolute: string;
  relative: string;
}

export interface CandidateSelector {
  value: string;
  source: 'class' | 'tag' | 'parent-class' | 'dom-selector';
}

export interface RuleMatch {
  selector: string;
  kind: string;
  confidence: number;
}
