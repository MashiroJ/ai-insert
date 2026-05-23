declare module 'react' {
  export interface ReactElement {
    readonly type: unknown;
    readonly props: unknown;
    readonly key: string | null;
  }

  export function createElement(type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]): ReactElement;
}

declare module 'next/script' {
  import type { ReactElement } from 'react';

  export interface ScriptProps {
    id?: string;
    strategy?: 'afterInteractive' | 'beforeInteractive' | 'lazyOnload' | 'worker';
    dangerouslySetInnerHTML?: {
      __html: string;
    };
  }

  export default function Script(props: ScriptProps): ReactElement;
}
