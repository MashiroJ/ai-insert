import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { ensureDaemon } from './daemon.js';
import { ensureProjectDevServer } from './project-dev.js';
import { ensureProjectIntegration } from './project-setup.js';
import { DEFAULT_DAEMON_URL, } from '@mashiro39/ui-inspect-protocol';
import { fetchHealth, fetchSelection, fetchSessions, postMessage, readSelectionSource, } from '@mashiro39/ui-inspect-server';
const SERVER_NAME = 'ui-inspect';
const SERVER_VERSION = '0.3.1';
const DEFAULT_WAIT_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_WAIT_TIMEOUT_MS = 10 * 60 * 1000;
const WAIT_POLL_INTERVAL_MS = 1000;
const TOOL_DEFS = [
    {
        name: 'start_ui_inspect',
        description: 'Start or verify ui-inspect for a Vite/Vue project. Canonical trigger phrase: "启用 ui-inspect". Also use this for "enable ui-inspect", "打开 UI 检查", or requests to connect browser element selection to an MCP coding agent. Ensures the local daemon, ensures @mashiro39/ui-inspect-vite-plugin is installed and uiInspect() is mounted in vite.config, starts or reuses the project dev server, and returns the detected browser URL without opening or refreshing it.',
        inputSchema: {
            type: 'object',
            properties: {
                project: {
                    type: 'string',
                    description: 'Project directory where ui-inspect should be enabled. Defaults to the MCP process cwd.',
                },
            },
            additionalProperties: false,
        },
        annotations: {
            title: 'Start ui-inspect daemon',
            readOnlyHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    },
    {
        name: 'get_frontend_selection',
        description: 'Read the current browser-selected frontend element, user instruction, framework metadata, and source file hint from ui-inspect.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: {
            title: 'Get selected frontend element',
            readOnlyHint: true,
            idempotentHint: true,
            openWorldHint: false,
        },
    },
    {
        name: 'wait_for_frontend_request',
        description: 'Wait for the user to select a frontend element and click Send in the ui-inspect browser panel. Use immediately after start_ui_inspect for the canonical "启用 ui-inspect" flow, so browser Send can continue the current AI conversation. Defaults to a 10 minute timeout; on timeout this tool shuts down the ui-inspect daemon and MCP process for this run.',
        inputSchema: {
            type: 'object',
            properties: {
                timeoutMs: {
                    type: 'number',
                    description: 'Maximum time to wait in milliseconds. Defaults to 600000 and is capped at 600000.',
                },
                context: {
                    type: 'number',
                    description: 'Number of source lines before and after the selected source line. Defaults to 80.',
                },
                sinceTimestamp: {
                    type: 'number',
                    description: 'Only return user messages at or after this Unix timestamp in milliseconds. Defaults to now minus 30 seconds to avoid missing quick browser sends.',
                },
            },
            additionalProperties: false,
        },
        annotations: {
            title: 'Wait for frontend request',
            readOnlyHint: true,
            idempotentHint: false,
            openWorldHint: false,
        },
    },
    {
        name: 'get_frontend_source',
        description: 'Read source context around the selected frontend component/file. Use after get_frontend_selection.',
        inputSchema: {
            type: 'object',
            properties: {
                context: {
                    type: 'number',
                    description: 'Number of lines before and after the selected source line. Defaults to 80.',
                },
            },
            additionalProperties: false,
        },
        annotations: {
            title: 'Read selected source context',
            readOnlyHint: true,
            idempotentHint: true,
            openWorldHint: false,
        },
    },
    {
        name: 'get_frontend_sessions',
        description: 'List ui-inspect debug sessions and their user/assistant messages.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: {
            title: 'List frontend debug sessions',
            readOnlyHint: true,
            idempotentHint: true,
            openWorldHint: false,
        },
    },
    {
        name: 'reply_to_user',
        description: 'Send an assistant reply into the current ui-inspect browser panel after modifying code, so the user can continue the same debug conversation.',
        inputSchema: {
            type: 'object',
            properties: {
                content: {
                    type: 'string',
                    description: 'Reply shown in the browser debug panel.',
                },
            },
            required: ['content'],
            additionalProperties: false,
        },
        annotations: {
            title: 'Reply in browser panel',
            readOnlyHint: false,
            idempotentHint: false,
            openWorldHint: false,
        },
    },
];
export async function runMcpStdio({ daemonUrl }) {
    const server = new Server({ name: SERVER_NAME, version: SERVER_VERSION }, {
        capabilities: { tools: {} },
        instructions: [
            'ui-inspect is a universal MCP context bridge for local frontend inspection.',
            'Treat "ui-inspect", "UI inspect", "UI 检查", and "界面检查" as user-facing aliases for ui-inspect.',
            'Canonical user trigger phrase: "启用 ui-inspect". When the user says this exact phrase, call start_ui_inspect immediately, tell the user to select an element and click Send in the browser panel, then call wait_for_frontend_request and continue editing when it returns.',
            'When the user asks to enable ui-inspect or UI inspection, first call start_ui_inspect to silently start or verify the local daemon, project integration, project dev server, and browser URL. Do not search the codebase for a ui-inspect feature first.',
            'start_ui_inspect returns integration and devServer status but must not open or refresh the browser. If devServer.url is present, tell the user to keep using that browser page.',
            'Interactive edit flow: after start_ui_inspect, call wait_for_frontend_request. When it returns a request, inspect the returned source and session, edit code according to the user instruction, then call reply_to_user with a short status asking whether the user wants more changes.',
            'If wait_for_frontend_request times out after 10 minutes, it shuts down this ui-inspect run and you should tell the user the browser request expired.',
        ].join('\n'),
    });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFS }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const name = request.params.name;
        const args = (request.params.arguments ?? {});
        try {
            if (name === 'start_ui_inspect') {
                const project = typeof args.project === 'string' && args.project.trim() ? args.project.trim() : process.cwd();
                await ensureDaemon({ daemonUrl, project });
                const integration = ensureProjectIntegration({ project });
                const devServer = await ensureProjectDevServer({ project, openBrowser: false });
                return textResult({
                    ok: true,
                    daemon: await fetchHealth(daemonUrl),
                    integration,
                    devServer,
                });
            }
            await ensureDaemon({ daemonUrl });
            if (name === 'get_frontend_selection') {
                return textResult(await fetchSelection(daemonUrl));
            }
            if (name === 'wait_for_frontend_request') {
                const context = contextLines(args.context);
                const timeoutMs = waitTimeoutMs(args.timeoutMs);
                const sinceTimestamp = typeof args.sinceTimestamp === 'number' && Number.isFinite(args.sinceTimestamp)
                    ? args.sinceTimestamp
                    : Date.now() - 30_000;
                const result = await waitForFrontendRequest({ daemonUrl, context, timeoutMs, sinceTimestamp });
                if (result.timedOut) {
                    await shutdownAfterTimeout(daemonUrl);
                }
                return textResult(result);
            }
            if (name === 'get_frontend_source') {
                const selection = await fetchSelection(daemonUrl);
                if (!selection.active || !selection.selection)
                    throw new Error('No active ui-inspect selection.');
                const context = contextLines(args.context);
                return textResult(await readSelectionSource(selection.selection, context));
            }
            if (name === 'get_frontend_sessions') {
                return textResult(await fetchSessions(daemonUrl));
            }
            if (name === 'reply_to_user') {
                if (typeof args.content !== 'string' || !args.content.trim()) {
                    throw new Error('content is required');
                }
                return textResult({
                    ok: true,
                    message: await postMessage(args.content.trim(), 'assistant', daemonUrl),
                });
            }
            throw new Error(`Unknown tool: ${name}`);
        }
        catch (err) {
            return {
                isError: true,
                content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
            };
        }
    });
    await server.connect(new StdioServerTransport());
}
async function waitForFrontendRequest({ daemonUrl, context, timeoutMs, sinceTimestamp, }) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() <= deadline) {
        const match = latestUserMessage(await fetchSessions(daemonUrl), sinceTimestamp);
        if (match) {
            const source = match.session.selection
                ? await readSourceIfAvailable(match.session.selection, context)
                : null;
            return {
                ok: true,
                timedOut: false,
                message: match.message,
                session: match.session,
                selection: match.session.selection,
                source,
            };
        }
        await sleep(WAIT_POLL_INTERVAL_MS);
    }
    return {
        ok: false,
        timedOut: true,
        timeoutMs,
        message: `No browser request was sent within ${Math.round(timeoutMs / 1000)} seconds. The ui-inspect daemon and MCP process are shutting down for this run.`,
    };
}
function latestUserMessage(payload, sinceTimestamp) {
    let latest = null;
    for (const session of payload.sessions) {
        for (const message of session.messages) {
            if (message.role !== 'user')
                continue;
            if (message.timestamp < sinceTimestamp)
                continue;
            if (!latest || message.timestamp > latest.message.timestamp) {
                latest = { session, message };
            }
        }
    }
    return latest;
}
async function readSourceIfAvailable(selection, context) {
    if (!selection?.source.file || !selection.source.root)
        return null;
    try {
        return await readSelectionSource(selection, context);
    }
    catch (err) {
        return {
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
async function shutdownAfterTimeout(daemonUrl) {
    try {
        await shutdownDaemon(daemonUrl);
    }
    catch {
        // Best-effort cleanup; the MCP process still exits below.
    }
    setTimeout(() => process.exit(0), 100).unref?.();
}
async function shutdownDaemon(daemonUrl = DEFAULT_DAEMON_URL) {
    const resp = await fetch(`${daemonUrl.replace(/\/$/, '')}/shutdown`, { method: 'POST' });
    if (!resp.ok)
        throw new Error(`daemon ${resp.status}: ${await resp.text()}`);
}
function contextLines(value) {
    return typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, Math.min(500, Math.floor(value)))
        : 80;
}
function waitTimeoutMs(value) {
    return typeof value === 'number' && Number.isFinite(value)
        ? Math.max(1000, Math.min(MAX_WAIT_TIMEOUT_MS, Math.floor(value)))
        : DEFAULT_WAIT_TIMEOUT_MS;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function textResult(value) {
    return {
        content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    };
}
//# sourceMappingURL=mcp.js.map