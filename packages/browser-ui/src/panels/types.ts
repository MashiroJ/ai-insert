/**
 * Panel types
 */

export type PanelMode = 'source' | 'single' | 'batch' | 'troubleshoot';

export interface PanelOptions {
  id?: string;
  title?: string;
  onClose?: () => void;
}

export interface ToastOptions {
  message: string;
  duration?: number;
  state?: 'info' | 'success' | 'error';
}
