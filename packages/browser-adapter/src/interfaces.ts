/**
 * Framework adapter interfaces for multi-framework support
 */

/**
 * Component information returned by framework adapters
 */
export interface ComponentInfo {
  name: string;
  displayName?: string;
  file?: string;
  instanceId?: string;
}

/**
 * Component tree node for hierarchy representation
 */
export interface ComponentTreeNode {
  info: ComponentInfo;
  children: ComponentTreeNode[];
  depth: number;
}

/**
 * Source location information
 */
export interface SourceLocation {
  file: string;
  line: number | null;
  column: number | null;
}

/**
 * Source hint with confidence scoring
 */
export interface SourceHint {
  kind: 'component-file' | 'template-file' | 'style-file' | 'config-file' | 'heuristic';
  file: string;
  line: number | null;
  column: number | null;
  confidence: number;
  reason: string;
  metadata?: Record<string, unknown>;
}

/**
 * Property value representation
 */
export type PropValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | PropValue[]
  | { [key: string]: PropValue };

/**
 * State value representation
 */
export type StateValue = PropValue;

/**
 * DevTools callback for integration
 */
export type DevToolsCallback = (message: unknown) => void;

/**
 * Framework adapter interface
 *
 * All framework adapters (Vue, React, Svelte, etc.) must implement this interface.
 * This allows ui-inspect to work with any frontend framework through a unified API.
 */
export interface FrameworkAdapter {
  /**
   * Adapter name (e.g., 'vue3', 'react', 'svelte', 'vanilla')
   */
  readonly name: string;

  /**
   * Framework version (if detectable)
   */
  readonly version?: string;

  /**
   * Get component information for a given element
   */
  getComponentInfo(element: HTMLElement): ComponentInfo | null;

  /**
   * Get the component hierarchy chain for a given element
   */
  getComponentChain(element: HTMLElement): ComponentInfo[];

  /**
   * Get the component tree starting from a given element
   */
  getComponentTree(element: HTMLElement): ComponentTreeNode;

  /**
   * Get source location for a given element's component
   */
  getSourceLocation(element: HTMLElement): SourceLocation | null;

  /**
   * Get all available source hints for a given element
   */
  getSourceHints(element: HTMLElement): SourceHint[];

  /**
   * Get component props for a given element
   */
  getComponentProps(element: HTMLElement): Record<string, PropValue>;

  /**
   * Get component state for a given element (if available)
   */
  getComponentState(element: HTMLElement): Record<string, StateValue> | null;

  /**
   * Check if this adapter can handle the current page
   */
  isAvailable(): boolean;

  /**
   * Install DevTools hook (optional, for frameworks with DevTools integration)
   * Returns a cleanup function
   */
  installDevToolsHook?(callback: DevToolsCallback): () => void;
}

/**
 * Adapter detection result
 */
export interface AdapterDetectionResult {
  adapter: FrameworkAdapter | null;
  confidence: number;
  reason?: string;
}

/**
 * Adapter factory options
 */
export interface AdapterFactoryOptions {
  /**
   * Prefer a specific adapter even if others are available
   */
  preferredAdapter?: string;

  /**
   * Allow fallback to vanilla adapter if no framework adapter is found
   */
  allowFallback?: boolean;

  /**
   * Custom adapters to include in detection
   */
  customAdapters?: FrameworkAdapter[];
}
