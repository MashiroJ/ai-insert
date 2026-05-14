import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { ensureDaemon } from './daemon.js';
import { ensureProjectDevServer } from './project-dev.js';
import { ensureProjectIntegration } from './project-setup.js';
import { fetchHealth, fetchSelection, fetchSessions, postMessage, readSelectionSource, } from '@mashiro39/ai-inspect-server';
const SERVER_NAME = 'ai-inspect';
const SERVER_VERSION = '0.1.0';
const TOOL_DEFS = [
    {
        name: 'start_ai_inspect',
        description: 'Start or verify ai-inspect for a Vite/Vue project. Canonical trigger phrase: "启用 ai-insert". Also use this for "enable ai-inspect", "enable ai-insert", "启用 ai-inspect", "打开 AI 调试", or requests to connect browser element selection to an MCP coding agent. Ensures the local daemon, ensures @mashiro39/ai-inspect-vite-plugin is installed and aiInspect() is mounted in vite.config, starts or reuses the project dev server, and returns the detected browser URL without opening or refreshing it.',
        inputSchema: {
            type: 'object',
            properties: {
                project: {
                    type: 'string',
                    description: 'Project directory where ai-inspect should be enabled. Defaults to the MCP process cwd.',
                },
            },
            additionalProperties: false,
        },
        annotations: {
            title: 'Start ai-inspect daemon',
            readOnlyHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    },
    {
        name: 'get_frontend_selection',
        description: 'Read the current browser-selected frontend element, user instruction, framework metadata, and source file hint from ai-inspect.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: {
            title: 'Get selected frontend element',
            readOnlyHint: true,
            idempotentHint: true,
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
        description: 'List ai-inspect debug sessions and their user/assistant messages.',
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
        description: 'Send an assistant reply into the current ai-inspect browser panel after modifying code, so the user can continue the same debug conversation.',
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
            'ai-inspect is a universal MCP context bridge for local frontend inspection.',
            'Treat "ai-insert", "AI insert", "AI 插入", and "AI 调试" as user-facing aliases for ai-inspect.',
            'Canonical user trigger phrase: "启用 ai-insert". When the user says this exact phrase, call start_ai_inspect immediately.',
            'When the user asks to enable ai-inspect or ai-insert, first call start_ai_inspect to silently start or verify the local daemon, project integration, project dev server, and browser URL. Do not search the codebase for an ai-insert feature first.',
            'start_ai_inspect returns integration and devServer status but must not open or refresh the browser. If devServer.url is present, tell the user to keep using that browser page.',
            'Manual edit flow: call get_frontend_selection, inspect the selected source, edit code, then call reply_to_user with a short status asking whether the user wants more changes.',
            'Browser Send records the user instruction in the ai-inspect session. It does not launch an agent; the connected MCP client should read the session and decide how to act.',
        ].join('\n'),
    });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFS }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const name = request.params.name;
        const args = (request.params.arguments ?? {});
        try {
            if (name === 'start_ai_inspect') {
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
            if (name === 'get_frontend_source') {
                const selection = await fetchSelection(daemonUrl);
                if (!selection.active || !selection.selection)
                    throw new Error('No active ai-inspect selection.');
                const context = typeof args.context === 'number' && Number.isFinite(args.context)
                    ? Math.max(0, Math.min(500, Math.floor(args.context)))
                    : 80;
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
function textResult(value) {
    return {
        content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    };
}
//# sourceMappingURL=mcp.js.map