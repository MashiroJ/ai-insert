import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSource } from './client-source.js';
const CLIENT_PATH = '/@ui-inspect/client.js';
const DIANA_PATH = '/@ui-inspect/diana.webp';
const DEFAULT_DAEMON_URL = 'http://127.0.0.1:17321';
const STATE_WATCH_IGNORES = ['**/.ui-inspect/**', '**/.ui-inspect/**/*'];
const DIANA_ASSET_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../src/assets/diana/spritesheet.webp');
export function uiInspect(options = {}) {
    let config;
    const enabled = options.enabled ?? true;
    const isEnabledForCurrentCommand = () => enabled && config?.command === 'serve';
    return {
        name: 'ui-inspect',
        apply: 'serve',
        enforce: 'post',
        config(userConfig) {
            if (!enabled)
                return;
            userConfig.server ??= {};
            userConfig.server.watch ??= {};
            userConfig.server.watch.ignored = mergeWatchIgnored(userConfig.server.watch.ignored);
        },
        configResolved(resolved) {
            config = resolved;
        },
        configureServer(server) {
            if (!isEnabledForCurrentCommand())
                return;
            const stateDir = join(config.root, '.ui-inspect');
            server.watcher.unwatch([stateDir, join(stateDir, '**')]);
            server.middlewares.use(CLIENT_PATH, (_req, res) => {
                res.setHeader('content-type', 'application/javascript; charset=utf-8');
                res.end(clientSource({
                    daemonUrl: options.daemonUrl ?? process.env.UI_INSPECT_DAEMON_URL ?? DEFAULT_DAEMON_URL,
                    root: config.root,
                }));
            });
            server.middlewares.use(DIANA_PATH, (_req, res) => {
                res.setHeader('content-type', 'image/webp');
                res.end(readFileSync(DIANA_ASSET_FILE));
            });
        },
        transformIndexHtml(html) {
            if (!isEnabledForCurrentCommand())
                return html;
            return {
                html,
                tags: [
                    {
                        tag: 'script',
                        attrs: { type: 'module', src: CLIENT_PATH },
                        injectTo: 'body',
                    },
                ],
            };
        },
    };
}
export default uiInspect;
function mergeWatchIgnored(existing) {
    if (!existing)
        return STATE_WATCH_IGNORES;
    if (Array.isArray(existing))
        return [...existing, ...STATE_WATCH_IGNORES];
    return [existing, ...STATE_WATCH_IGNORES];
}
//# sourceMappingURL=index.js.map