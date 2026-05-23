/**
 * Next.js Script component integration for ui-inspect.
 */

import { clientSource } from '@ui-inspect/browser-ui/client-source';
import { createElement, type ReactElement } from 'react';
import Script from 'next/script';
import type { UiInspectScriptProps } from './types.js';

const DEFAULT_DAEMON_URL = 'http://127.0.0.1:17321';
const DEFAULT_DIANA_SPRITE_URL = '/api/ui-inspect/diana';
const SCRIPT_ID = 'ui-inspect-client';

export function UiInspectScript(options: UiInspectScriptProps = {}): ReactElement | null {
  if (options.enabled === false) return null;
  if (process.env.NODE_ENV === 'production') return null;

  const dianaSpriteUrl = options.dianaSpriteUrl ?? DEFAULT_DIANA_SPRITE_URL;
  const source = clientSource({
    daemonUrl: options.daemonUrl ?? DEFAULT_DAEMON_URL,
    root: options.root ?? process.cwd(),
    dianaSpriteUrl,
  });

  return createElement(Script, {
    id: SCRIPT_ID,
    strategy: 'afterInteractive',
    dangerouslySetInnerHTML: { __html: source },
  });
}
