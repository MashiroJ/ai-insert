import { join } from 'node:path';
import { clientSource } from './client-source.js';
const CLIENT_PATH = '/@ai-inspect/client.js';
const DEFAULT_DAEMON_URL = 'http://127.0.0.1:17321';
const STATE_WATCH_IGNORES = ['**/.ai-insert/**', '**/.ai-insert/**/*'];
export function aiInspect(options = {}) {
    let config;
    const enabled = options.enabled ?? true;
    const isEnabledForCurrentCommand = () => enabled && config?.command === 'serve';
    return {
        name: 'ai-inspect',
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
            const stateDir = join(config.root, '.ai-insert');
            server.watcher.unwatch([stateDir, join(stateDir, '**')]);
            server.middlewares.use(CLIENT_PATH, (_req, res) => {
                res.setHeader('content-type', 'application/javascript; charset=utf-8');
                res.end(clientSource({
                    daemonUrl: options.daemonUrl ?? process.env.AI_INSPECT_DAEMON_URL ?? DEFAULT_DAEMON_URL,
                    root: config.root,
                }));
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
export default aiInspect;
function mergeWatchIgnored(existing) {
    if (!existing)
        return STATE_WATCH_IGNORES;
    if (Array.isArray(existing))
        return [...existing, ...STATE_WATCH_IGNORES];
    return [existing, ...STATE_WATCH_IGNORES];
}
//# sourceMappingURL=index.js.map