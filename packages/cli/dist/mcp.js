import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { ensureDaemon } from './daemon.js';
import { ensureProjectIntegration } from './project-setup.js';
import { DEFAULT_DAEMON_URL, } from '@ui-inspect/protocol';
import { fetchHealth, fetchSelection, fetchSessions, postMessage, readSelectionSource, } from '@ui-inspect/server';
import { getVersion } from './version.js';
import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';
const SERVER_NAME = 'ui-inspect';
const SERVER_VERSION = getVersion();
const DEFAULT_WAIT_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_WAIT_TIMEOUT_MS = 10 * 60 * 1000;
const WAIT_POLL_INTERVAL_MS = 1000;
const COMPLETE_FRONTEND_REQUEST_STATUSES = ['done', 'failed'];
const TOOL_DEFS = [
    {
        name: 'start_ui_inspect',
        description: 'Start or verify ui-inspect for a local frontend project. Use this when the user asks to start, enable, launch, open, use, invoke, or turn on ui-inspect, including "start ui-inspect", "enable ui-inspect", "use ui-inspect", "启用 ui-inspect", "使用 ui-inspect", "调用 ui-inspect", "打开 UI 检查", or requests to connect browser element selection to an MCP coding agent. Do not trigger on the bare word "ui-inspect" when the user is only asking about docs, installation, errors, or general information. Ensures the local daemon, detects the project integration status, and returns framework-specific next steps. Vite projects may be auto-installed/patched; Next.js projects return manual App Router or Pages Router instructions. It never starts the user project dev server and never opens the browser.',
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
        description: 'Wait for the user to select a frontend element and click Send in the ui-inspect browser panel. Use immediately after start_ui_inspect for start/enable/use/invoke ui-inspect flows, so browser Send can continue the current AI conversation. Defaults to a 10 minute timeout; on timeout this tool shuts down the ui-inspect daemon and MCP process for this run. For continuous browser work, finish each returned task with complete_frontend_request instead of reply_to_user.',
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
                afterRequestId: {
                    type: 'string',
                    description: 'Request cursor returned by the previous wait_for_frontend_request call. When provided, only newer browser requests are returned. Pass the nextCursor.afterRequestId value from the previous response.',
                },
                responseMode: {
                    type: 'string',
                    enum: ['compact', 'full'],
                    description: 'Return compact by default for MCP hosts such as Cursor. Use full only when raw session/source payload is required.',
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
        name: 'update_ui_task_status',
        description: 'Update a ui-inspect browser task status so the user can see whether the AI has received, is working on, completed, or failed the task.',
        inputSchema: {
            type: 'object',
            properties: {
                sessionId: {
                    type: 'string',
                    description: 'ui-inspect session id. Defaults to the active session when omitted.',
                },
                status: {
                    type: 'string',
                    enum: ['claimed', 'working', 'done', 'failed'],
                    description: 'Task status shown in the browser panel.',
                },
            },
            required: ['status'],
            additionalProperties: false,
        },
        annotations: {
            title: 'Update UI task status',
            readOnlyHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    },
    {
        name: 'reply_to_user',
        description: 'Send an assistant reply into the current ui-inspect browser panel for progress or confirmation. For final task completion in the continuous browser loop, prefer complete_frontend_request so the agent immediately waits for the next browser request.',
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
    {
        name: 'complete_frontend_request',
        description: 'Complete the current ui-inspect browser request, send the final browser-panel reply, then immediately wait for the next browser request. Use this as the final step after handling a wait_for_frontend_request result so the user can keep sending tasks from the browser without returning to chat.',
        inputSchema: {
            type: 'object',
            properties: {
                sessionId: {
                    type: 'string',
                    description: 'Current ui-inspect session id from the browser request being completed.',
                },
                content: {
                    type: 'string',
                    description: 'Final reply shown in the browser panel for the current request.',
                },
                afterRequestId: {
                    type: 'string',
                    description: 'Cursor from the current request, usually nextCursor.afterRequestId. Required to avoid consuming the same browser request again.',
                },
                status: {
                    type: 'string',
                    enum: ['done', 'failed'],
                    description: 'Final task status for the current request. Defaults to done.',
                },
                timeoutMs: {
                    type: 'number',
                    description: 'Maximum time to wait for the next browser request in milliseconds. Defaults to 600000 and is capped at 600000.',
                },
                context: {
                    type: 'number',
                    description: 'Number of source lines before and after the selected source line for the next request. Defaults to 80.',
                },
                sinceTimestamp: {
                    type: 'number',
                    description: 'Fallback timestamp filter used only when the cursor is unknown. Defaults to now minus 30 seconds.',
                },
                responseMode: {
                    type: 'string',
                    enum: ['compact', 'full'],
                    description: 'Return compact by default for MCP hosts such as Cursor. Use full only when raw session/source payload is required.',
                },
            },
            required: ['sessionId', 'content', 'afterRequestId'],
            additionalProperties: false,
        },
        annotations: {
            title: 'Complete request and wait',
            readOnlyHint: false,
            idempotentHint: false,
            openWorldHint: false,
        },
    },
];
export function getMcpToolDefinition(name) {
    return TOOL_DEFS.find((tool) => tool.name === name);
}
export function resolveProjectRoot(input, env = process.env, cwd = process.cwd(), pathDelimiter = delimiter) {
    if (typeof input === 'string' && input.trim())
        return input.trim();
    const raw = env.WORKSPACE_FOLDER_PATHS;
    if (raw) {
        const splitters = ['\n', ',', pathDelimiter];
        let paths = [raw];
        for (const splitter of splitters) {
            paths = paths.flatMap((p) => p.split(splitter));
        }
        paths = paths.map((p) => p.trim()).filter(Boolean);
        const withPackageJson = paths.find((p) => existsSync(join(p, 'package.json')));
        if (withPackageJson)
            return withPackageJson;
        if (paths.length > 0)
            return paths[0];
    }
    return cwd;
}
export async function runMcpStdio({ daemonUrl }) {
    const server = new Server({ name: SERVER_NAME, version: SERVER_VERSION }, {
        capabilities: { tools: {} },
        instructions: [
            'ui-inspect is a universal MCP context bridge for local frontend inspection.',
            'Treat "ui-inspect", "UI inspect", "UI 检查", and "界面检查" as user-facing aliases for ui-inspect.',
            'Trigger phrases include "start ui-inspect", "enable ui-inspect", "use ui-inspect", "launch ui-inspect", "turn on ui-inspect", "启用 ui-inspect", "使用 ui-inspect", "调用 ui-inspect", "启动 ui-inspect", and "打开 UI 检查". When the user asks for one of these actions, call start_ui_inspect immediately, tell the user to select an element and click Send in the browser panel, then call wait_for_frontend_request and continue editing when it returns.',
            'Do not trigger the workflow on the bare word "ui-inspect" when the user is only asking about docs, installation, errors, or general information.',
            'When the user asks to start, enable, use, invoke, or open ui-inspect or UI inspection, first call start_ui_inspect to silently start or verify the local daemon and project integration. Use its integration.projectType, missing, and nextSteps fields to guide setup instead of assuming Vite/Vue. Do not search the codebase for a ui-inspect feature first.',
            'start_ui_inspect never starts the user project dev server and must not open or refresh the browser. It may auto-patch supported Vite projects, but for Next.js and unknown projects it returns manual setup instructions. Tell the user to complete any returned setup steps, then start or keep using their frontend dev server, select an element, and click Send.',
            'Interactive edit flow: after start_ui_inspect, call wait_for_frontend_request. When it returns ok: true, you have received a valid browser task even if message.content is empty or auto-generated. Do not tell the user to verify the dev server or browser panel. Inspect the returned contextSummary, targetsSummary, and session, call update_ui_task_status with "working", then edit code according to the user instruction, selected element, and per-target notes. When you need full source code or the complete targets list, use get_frontend_source or pass responseMode: "full".',
            'Continuous browser task loop: after processing a browser task, the final step MUST be complete_frontend_request with session.id, a concise completion reply, and afterRequestId from the current response\'s nextCursor.afterRequestId. Do not call update_ui_task_status("done") before complete_frontend_request; complete_frontend_request already updates the final status. This marks the current task done or failed, replies in the browser panel, and waits for the next browser task. If complete_frontend_request returns ok: true with a new requestId, immediately process that next task and finish it with complete_frontend_request again. Keep looping until: the user explicitly asks to stop, complete_frontend_request or wait_for_frontend_request times out, or the current task requires user confirmation before continuing.',
            'Use reply_to_user only for mid-task progress, user confirmation, or intentional one-off replies that should not continue waiting. Do not use reply_to_user as the final completion step for browser tasks when you can call complete_frontend_request.',
            'For batch mode, use targetsSummary for per-target notes. When you need the full targets array or per-target source code, use responseMode: "full" or call get_frontend_source.',
            'For troubleshoot mode, inspect diagnostics and runtimeSummary before changing code. Treat logs as user-confirmed context, not as complete truth.',
            'For css-debug mode, first read targetsSummary and cssDebug.targets[*].changedStyles, styleSourceHints, layoutHints, and specificityWarnings. Then read changedStyles, computedEffects, layoutContext, interactions, primaryInteraction, originalStyles, previewStyles, and the user note. Treat changedStyles as the user-intended edits; treat primaryInteraction as the strongest signal of the user drag intent. For move interactions, transform is a preview expression of that drag — do not default to writing transform into source code. When layoutHints is present, prefer its suggestedProperty (e.g. margin-left, align-self, justify-self) as the persistent source change. When specificityWarnings is present, verify that your edits will not be overridden by a later rule. Treat computedEffects and layoutContext as evidence about side effects on the selected element, parent, siblings, and children. Prefer changing project source styles or component styles instead of copying browser preview inline styles directly. When cssDebug.styleSourceHints is present, inspect it before editing: it ranks candidate source rules by confidence and explains which file/line/selector to change. For transform created by dragging, do not blindly write inline transform into source; prefer layout or spacing hints unless source already uses transform intentionally. For multi-target CSS Debug, apply each target\'s changes through its own styleSourceHints, layoutHints, and specificityWarnings. Consider layout impact before editing, then call complete_frontend_request so the browser panel reflects completion and the next browser task can be received.',
            'When sourceHints contains multiple candidates, prefer higher confidence project files and read source before assuming selection.source is exact.',
            'When compact responses omit source.content, use get_frontend_source if you need the full source before editing.',
            'If an MCP host stores large tool output in a file, read that file and continue processing the returned request.',
            'If wait_for_frontend_request times out after 10 minutes, it shuts down this ui-inspect run and you should tell the user the browser request expired.',
        ].join('\n'),
    });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFS }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const name = request.params.name;
        const args = (request.params.arguments ?? {});
        try {
            if (name === 'start_ui_inspect') {
                const project = resolveProjectRoot(args.project);
                const daemonResult = await ensureDaemon({ daemonUrl, project });
                const integration = ensureProjectIntegration({ project });
                return textResult({
                    ok: true,
                    daemon: await fetchHealth(daemonUrl),
                    integration,
                    warnings: daemonResult.warnings,
                    devServer: {
                        skipped: true,
                        started: false,
                        url: null,
                        message: 'ui-inspect does not start the project dev server. Ask the user to start their own frontend dev server and open the page they want to inspect.',
                    },
                    nextSteps: [
                        'Check integration.nextSteps and ask the user to complete any missing setup first.',
                        'Ask the user to start or keep using their frontend dev server.',
                        'Ask the user to open the target page in the browser.',
                        'Ask the user to select an element in the ui-inspect panel and click Send.',
                        'Call wait_for_frontend_request and continue editing when it returns.',
                    ],
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
                const afterRequestId = typeof args.afterRequestId === 'string' && args.afterRequestId.trim()
                    ? args.afterRequestId.trim()
                    : undefined;
                const result = await waitForFrontendRequest({ daemonUrl, context, timeoutMs, sinceTimestamp, afterRequestId });
                if (result.timedOut) {
                    await shutdownAfterTimeout(daemonUrl);
                }
                return textResult(isCompactMode(args.responseMode) ? compactFrontendRequestResult(result) : result);
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
            if (name === 'update_ui_task_status') {
                const status = typeof args.status === 'string' ? args.status : '';
                if (!['claimed', 'working', 'done', 'failed'].includes(status))
                    throw new Error('status must be claimed, working, done, or failed');
                const sessionId = typeof args.sessionId === 'string' && args.sessionId.trim()
                    ? args.sessionId.trim()
                    : (await fetchSelection(daemonUrl)).session?.id;
                if (!sessionId)
                    throw new Error('sessionId is required when there is no active session');
                return textResult(await updateTaskStatus(daemonUrl, sessionId, status));
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
            if (name === 'complete_frontend_request') {
                const input = normalizeCompleteFrontendRequestArgs(args);
                const statusResult = await updateTaskStatus(daemonUrl, input.sessionId, input.status);
                const replyMessage = await postMessage(input.content, 'assistant', daemonUrl, { sessionId: input.sessionId });
                const nextRequest = await waitForFrontendRequest({
                    daemonUrl,
                    context: input.context,
                    timeoutMs: input.timeoutMs,
                    sinceTimestamp: input.sinceTimestamp,
                    afterRequestId: input.afterRequestId,
                });
                if (nextRequest.timedOut) {
                    await shutdownAfterTimeout(daemonUrl);
                }
                const compact = isCompactMode(args.responseMode);
                return textResult(compact ? {
                    completed: {
                        ok: true,
                        sessionId: input.sessionId,
                        status: input.status,
                    },
                    ...compactFrontendRequestResult(nextRequest),
                } : {
                    completed: {
                        ok: true,
                        sessionId: input.sessionId,
                        status: input.status,
                        replyMessage,
                        statusResult,
                    },
                    ...nextRequest,
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
export function normalizeCompleteFrontendRequestArgs(args, now = Date.now()) {
    const sessionId = requiredTrimmedString(args.sessionId, 'sessionId');
    const content = requiredTrimmedString(args.content, 'content');
    const afterRequestId = requiredTrimmedString(args.afterRequestId, 'afterRequestId');
    const status = typeof args.status === 'string' && args.status.trim()
        ? args.status.trim()
        : 'done';
    if (!COMPLETE_FRONTEND_REQUEST_STATUSES.includes(status)) {
        throw new Error('status must be done or failed');
    }
    return {
        sessionId,
        content,
        afterRequestId,
        status: status,
        context: contextLines(args.context),
        timeoutMs: waitTimeoutMs(args.timeoutMs),
        sinceTimestamp: typeof args.sinceTimestamp === 'number' && Number.isFinite(args.sinceTimestamp)
            ? args.sinceTimestamp
            : now - 30_000,
    };
}
function requiredTrimmedString(value, name) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`${name} is required`);
    }
    return value.trim();
}
async function waitForFrontendRequest({ daemonUrl, context, timeoutMs, sinceTimestamp, afterRequestId, }) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() <= deadline) {
        const match = latestFrontendRequest(await fetchSessions(daemonUrl), sinceTimestamp, afterRequestId);
        if (match) {
            const claimed = await updateTaskStatus(daemonUrl, match.session.id, 'claimed').catch(() => null);
            const session = claimed?.session || match.session;
            const source = session.selection
                ? await readSourceIfAvailable(session.selection, context)
                : null;
            const targetSources = await Promise.all((session.targets || []).map(async (target) => ({
                id: target.id,
                note: target.note,
                selection: target.selection,
                source: await readSourceIfAvailable(target.selection, context),
            })));
            return {
                ok: true,
                timedOut: false,
                requestId: match.requestId,
                nextCursor: { afterRequestId: match.requestId },
                message: match.message,
                session,
                selection: session.selection,
                targetCount: session.targets?.length || 0,
                targets: session.targets || [],
                source,
                targetSources,
                contextSummary: summarizeSelection(session.selection),
                targetsSummary: summarizeTargets(session.targets || [], session.cssDebug),
                batchContext: buildBatchContext(session.targets || []),
                sourceHintSummary: summarizeSourceHints(session.selection, session.targets || []),
                runtimeSummary: summarizeDiagnostics(session.diagnostics || session.selection?.diagnostics),
                diagnostics: session.diagnostics || session.selection?.diagnostics || null,
                cssDebug: session.cssDebug || null,
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
function summarizeSelection(selection) {
    if (!selection)
        return 'No selected element.';
    const title = selectionTitle(selection);
    const context = selection.context;
    const parts = [
        `Element: ${title}`,
        selection.source?.file ? `Source: ${sourceLabel(selection)}` : 'Source: unavailable',
    ];
    if (context?.accessibleName)
        parts.push(`Accessible name: ${context.accessibleName}`);
    if (context?.role)
        parts.push(`Role: ${context.role}`);
    if (context?.formContext) {
        const form = Object.entries(context.formContext).filter(([, value]) => value).map(([key, value]) => `${key}=${value}`).join(', ');
        if (form)
            parts.push(`Form context: ${form}`);
    }
    if (selection.dom?.styles) {
        const style = ['display', 'position', 'width', 'height', 'fontSize', 'borderRadius']
            .map((key) => selection.dom.styles[key] ? `${key}=${selection.dom.styles[key]}` : '')
            .filter(Boolean)
            .join(', ');
        if (style)
            parts.push(`Styles: ${style}`);
    }
    return parts.join('\n');
}
function summarizeTargets(targets, cssDebug) {
    if (!targets.length)
        return 'No targets.';
    const debugTargets = cssDebug && typeof cssDebug === 'object'
        ? cssDebug.targets
        : undefined;
    return targets.map((target, index) => {
        const selection = target.selection;
        const note = target.note ? ` | note: ${target.note}` : '';
        let line = `${index + 1}. ${selectionTitle(selection)} | ${sourceLabel(selection) || selection.dom?.selector || 'no source'}${note}`;
        // Enrich with CSS debug target data if available
        const debugTarget = debugTargets?.find((t) => t.id === target.id || t.selection?.id === selection.id);
        if (debugTarget) {
            const changed = debugTarget.changedStyles;
            if (changed && typeof changed === 'object') {
                const entries = Object.entries(changed)
                    .map(([prop, val]) => `${prop} ${val.originalValue ?? 'auto'} -> ${val.previewValue ?? 'auto'}`)
                    .join(', ');
                if (entries)
                    line += ` | changed: ${entries}`;
            }
            const styleHints = debugTarget.styleSourceHints;
            if (Array.isArray(styleHints) && styleHints.length > 0) {
                const best = styleHints[0];
                const hintLine = best.line ? `:${best.line}` : '';
                const sel = best.selector ? ` ${best.selector}` : '';
                line += `\n   style: ${best.file}${hintLine}${sel} confidence=${best.confidence}`;
            }
            const layoutHints = debugTarget.layoutHints;
            if (Array.isArray(layoutHints) && layoutHints.length > 0) {
                const best = layoutHints[0];
                line += `\n   layout: ${best.suggestedProperty} confidence=${best.confidence}`;
            }
        }
        return line;
    }).join('\n');
}
function buildBatchContext(targets) {
    const groups = new Map();
    const components = new Map();
    for (const target of targets) {
        const file = target.selection.source?.file || '(no source)';
        groups.set(file, (groups.get(file) || 0) + 1);
        const component = target.selection.vue?.componentName;
        if (component)
            components.set(component, (components.get(component) || 0) + 1);
    }
    return {
        targetCount: targets.length,
        groupsBySourceFile: Array.from(groups.entries()).map(([file, count]) => ({ file, count })),
        sharedComponents: Array.from(components.entries()).map(([component, count]) => ({ component, count })),
        targetsChecklist: targets.map((target, index) => ({
            index: index + 1,
            id: target.id,
            title: selectionTitle(target.selection),
            note: target.note,
            source: sourceLabel(target.selection),
        })),
    };
}
function summarizeSourceHints(selection, targets) {
    const hints = [
        ...(selection?.sourceHints || []),
        ...targets.flatMap((target) => target.selection.sourceHints || target.sourceHints || []),
    ];
    if (!hints.length)
        return 'No source hints.';
    return hints
        .slice()
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
        .slice(0, 10)
        .map((hint, index) => `${index + 1}. [${hint.kind}] ${hint.file || '(no file)'}${hint.line ? `:${hint.line}` : ''} confidence=${hint.confidence} reason=${hint.reason}`)
        .join('\n');
}
function summarizeDiagnostics(diagnostics) {
    if (!diagnostics || typeof diagnostics !== 'object')
        return 'No user-confirmed runtime diagnostics.';
    const events = Array.isArray(diagnostics.runtimeEvents)
        ? diagnostics.runtimeEvents
        : [];
    if (!events.length)
        return 'No user-confirmed runtime diagnostics.';
    return events.slice(0, 10).map((event, index) => {
        const time = event.timestamp ? new Date(event.timestamp).toISOString() : '';
        return `${index + 1}. [${event.level || 'error'}] ${event.kind || 'runtime'} ${time}\n${event.message || ''}`;
    }).join('\n');
}
function selectionTitle(selection) {
    const dom = selection.dom;
    const tag = dom?.tagName || 'element';
    const text = dom?.text ? ` · ${dom.text.slice(0, 60)}` : '';
    const vue = selection.vue?.componentName ? `${selection.vue.componentName} · ` : '';
    const id = dom?.id ? `#${dom.id}` : '';
    return `${vue}${tag}${id}${text}`;
}
function sourceLabel(selection) {
    const source = selection.source;
    if (!source?.file)
        return '';
    return `${source.file}${source.line ? `:${source.line}` : ''}`;
}
function compactSource(source) {
    if (!source || typeof source !== 'object')
        return source;
    const { content, ...meta } = source;
    return meta;
}
function compactSelection(selection) {
    if (!selection)
        return null;
    const component = selection.component;
    return {
        id: selection.id,
        framework: selection.framework,
        tagName: selection.dom?.tagName,
        selector: selection.dom?.selector,
        text: selection.dom?.text?.slice(0, 120),
        componentName: component?.name || selection.vue?.componentName || null,
        sourceFile: selection.source?.file || null,
        sourceLine: selection.source?.line ?? null,
        sourceColumn: selection.source?.column ?? null,
        sourceLineConfidence: selection.sourceHints?.find((h) => h.kind === 'template-file')?.confidence ?? null,
        sourceLineReason: selection.sourceHints?.find((h) => h.kind === 'template-file')?.reason ?? null,
    };
}
function summarizeCssDebug(cssDebug) {
    if (!cssDebug || typeof cssDebug !== 'object')
        return '';
    const payload = cssDebug;
    const parts = [];
    const targets = payload.targets;
    if (Array.isArray(targets) && targets.length > 0) {
        parts.push(`${targets.length} targets changed`);
        for (const t of targets.slice(0, 5)) {
            const sel = t.selection;
            const dom = sel?.dom;
            const tag = dom?.tagName ?? '?';
            const text = String(dom?.text ?? '').slice(0, 30);
            const changed = t.changedStyles;
            const props = changed
                ? Object.entries(changed).map(([p, v]) => `${p} ${String(v?.originalValue ?? 'auto')} -> ${String(v?.previewValue ?? 'auto')}`).join(', ')
                : '';
            parts.push(`  ${tag}: ${text} → ${props}`);
            // Per-target styleSourceHints
            const styleHints = t.styleSourceHints;
            if (Array.isArray(styleHints) && styleHints.length > 0) {
                const best = styleHints[0];
                const hintLine = best.line ? `:${best.line}` : '';
                const sel_ = best.selector ? ` ${best.selector}` : '';
                parts.push(`    style: ${best.file}${hintLine}${sel_} confidence=${best.confidence}`);
            }
            // Per-target layoutHints
            const layoutHints = t.layoutHints;
            if (Array.isArray(layoutHints) && layoutHints.length > 0) {
                for (const lh of layoutHints.slice(0, 2)) {
                    parts.push(`    layout: ${lh.suggestedProperty} confidence=${lh.confidence} reason=${lh.reason}`);
                }
            }
            // Per-target specificityWarnings
            const specWarnings = t.specificityWarnings;
            if (Array.isArray(specWarnings) && specWarnings.length > 0) {
                for (const sw of specWarnings.slice(0, 2)) {
                    parts.push(`    specificity: ${sw.severity} ${sw.selector} line=${sw.line} property=${sw.property} reason=${sw.reason}`);
                }
            }
        }
    }
    else {
        const changed = payload.changedStyles;
        if (changed && typeof changed === 'object') {
            const entries = Object.entries(changed)
                .map(([property, value]) => `${property}: ${String(value?.originalValue || 'auto')} -> ${String(value?.previewValue || 'auto')}`);
            if (entries.length)
                parts.push(`changedStyles: ${entries.join(', ')}`);
        }
    }
    const interaction = payload.primaryInteraction;
    if (interaction && typeof interaction === 'object') {
        const i = interaction;
        const label = [i.type, i.handle].filter(Boolean).join(' ');
        if (label)
            parts.push(`primaryInteraction: ${label}`);
        if (i.delta && typeof i.delta === 'object') {
            const delta = i.delta;
            parts.push(`delta: x=${delta.x ?? 0}, y=${delta.y ?? 0}, w=${delta.width ?? 0}, h=${delta.height ?? 0}`);
        }
    }
    if (payload.note)
        parts.push(String(payload.note));
    if (Array.isArray(payload.styleSourceHints) && payload.styleSourceHints.length > 0) {
        parts.push('Style source hints:');
        for (const hint of payload.styleSourceHints.slice(0, 10)) {
            const line = hint.line ? `:${hint.line}` : '';
            const selector = hint.selector ? ` ${hint.selector}` : '';
            parts.push(`  ${hint.targetId} -> ${hint.file}${line}${selector} confidence=${hint.confidence} reason=${hint.reason}`);
        }
    }
    return parts.length ? parts.join('; ') : '';
}
function compactCssDebug(cssDebug, topLevelSelectionId) {
    if (!cssDebug || typeof cssDebug !== 'object')
        return undefined;
    const payload = cssDebug;
    const result = {
        changedStyles: payload.changedStyles,
        computedEffects: payload.computedEffects,
        layoutContext: payload.layoutContext,
        interactions: Array.isArray(payload.interactions) ? payload.interactions.slice(-8) : payload.interactions,
        primaryInteraction: payload.primaryInteraction,
        note: payload.note,
        styleSourceHints: payload.styleSourceHints,
    };
    if (typeof payload.batch === 'boolean')
        result.batch = payload.batch;
    if (typeof payload.primaryTargetId === 'string')
        result.primaryTargetId = payload.primaryTargetId;
    if (typeof payload.changedTargetCount === 'number')
        result.changedTargetCount = payload.changedTargetCount;
    if (Array.isArray(payload.targets)) {
        result.targets = payload.targets.map((t) => {
            const targetSel = (t.selection ?? null);
            const targetSelId = targetSel?.id;
            const compacted = {
                id: t.id,
                selection: targetSelId && targetSelId === topLevelSelectionId
                    ? { selectionRef: topLevelSelectionId }
                    : compactSelection(targetSel),
                selectedElement: t.selectedElement,
                changedStyles: t.changedStyles,
                computedEffects: t.computedEffects,
                layoutContext: t.layoutContext,
                interactions: Array.isArray(t.interactions) ? t.interactions.slice(-4) : t.interactions,
                primaryInteraction: t.primaryInteraction,
                note: t.note,
                styleSourceHints: t.styleSourceHints,
                layoutHints: t.layoutHints,
                specificityWarnings: t.specificityWarnings,
            };
            return compacted;
        });
    }
    return result;
}
export function compactFrontendRequestResult(result) {
    if (!result || typeof result !== 'object')
        return result;
    const r = result;
    if (r.timedOut)
        return r;
    const session = r.session;
    const source = compactSource(r.source);
    const cssDebug = r.cssDebug || session?.cssDebug;
    return {
        ok: r.ok,
        timedOut: false,
        requestId: r.requestId,
        nextCursor: r.nextCursor,
        message: r.message,
        session: session
            ? { id: session.id, status: session.status, mode: session.mode, createdAt: session.createdAt, updatedAt: session.updatedAt }
            : undefined,
        selection: compactSelection(r.selection),
        targetCount: r.targetCount,
        contextSummary: r.contextSummary,
        targetsSummary: r.targetsSummary,
        sourceHintSummary: r.sourceHintSummary,
        runtimeSummary: r.runtimeSummary,
        diagnosticsSummary: r.diagnostics
            ? `runtimeEvents=${r.diagnostics?.runtimeEvents?.length ?? 0}, truncated=${r.diagnostics?.truncated ?? false}`
            : undefined,
        cssDebugSummary: cssDebug ? summarizeCssDebug(cssDebug) : undefined,
        cssDebug: compactCssDebug(cssDebug, r.selection?.id),
        source,
    };
}
function isCompactMode(responseMode) {
    if (typeof responseMode !== 'string')
        return true;
    return responseMode.trim().toLowerCase() !== 'full';
}
async function updateTaskStatus(daemonUrl, sessionId, status) {
    const resp = await fetch(`${daemonUrl.replace(/\/$/, '')}/sessions/${encodeURIComponent(sessionId)}/status`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
    });
    if (!resp.ok)
        throw new Error(`daemon ${resp.status}: ${await resp.text()}`);
    return await resp.json();
}
export function latestFrontendRequest(payload, sinceTimestamp, afterRequestId) {
    const cursorFound = afterRequestId ? parseCursorTimestamp(afterRequestId, payload.sessions) : null;
    const candidates = [];
    for (const session of payload.sessions) {
        for (const message of session.messages) {
            if (message.role !== 'user')
                continue;
            candidates.push({
                requestId: `message:${message.id}`,
                timestamp: message.timestamp,
                session,
                message,
            });
        }
        if (session.selection && session.status === 'sent') {
            const coveredByUserMessage = session.messages.some((m) => m.role === 'user' && m.selectionId === session.selection.id);
            if (coveredByUserMessage)
                continue;
            const selectionTimestamp = session.selection.timestamp || 0;
            const requestTimestamp = Math.max(session.updatedAt || 0, selectionTimestamp);
            candidates.push({
                requestId: `selection:${session.selection.id}`,
                timestamp: requestTimestamp,
                session,
                message: syntheticSelectionMessage(session, requestTimestamp),
            });
        }
    }
    candidates.sort((a, b) => a.timestamp - b.timestamp || (a.requestId < b.requestId ? -1 : a.requestId > b.requestId ? 1 : 0));
    if (afterRequestId) {
        const cursorIndex = candidates.findIndex((c) => c.requestId === afterRequestId);
        if (cursorIndex >= 0) {
            const remaining = candidates.slice(cursorIndex + 1);
            return remaining.length > 0
                ? { session: remaining[0].session, message: remaining[0].message, requestId: remaining[0].requestId }
                : null;
        }
        const effectiveSince = cursorFound ?? sinceTimestamp;
        const afterCursor = candidates.filter((c) => c.timestamp > effectiveSince);
        return afterCursor.length > 0
            ? { session: afterCursor[0].session, message: afterCursor[0].message, requestId: afterCursor[0].requestId }
            : null;
    }
    const filtered = candidates.filter((c) => c.timestamp >= sinceTimestamp);
    return filtered.length > 0
        ? { session: filtered[0].session, message: filtered[0].message, requestId: filtered[0].requestId }
        : null;
}
function parseCursorTimestamp(cursor, sessions) {
    if (cursor.startsWith('message:')) {
        const msgId = cursor.slice('message:'.length);
        for (const session of sessions) {
            for (const message of session.messages) {
                if (message.id === msgId)
                    return message.timestamp;
            }
        }
        return null;
    }
    if (cursor.startsWith('selection:')) {
        const selId = cursor.slice('selection:'.length);
        for (const session of sessions) {
            if (session.selection?.id === selId) {
                return Math.max(session.updatedAt || 0, session.selection.timestamp || 0);
            }
        }
        return null;
    }
    return null;
}
function syntheticSelectionMessage(session, timestamp) {
    const selection = session.selection;
    const targetNotes = (session.targets || [])
        .map((target, index) => {
        const note = target.note || target.selection.note || '';
        return note.trim() ? `${index + 1}. ${note.trim()}` : '';
    })
        .filter(Boolean);
    const content = selection?.instruction
        || selection?.note
        || (targetNotes.length ? `Target notes:\n${targetNotes.join('\n')}` : '')
        || 'Browser selection sent without additional user text.';
    return {
        id: `${session.id}:selection-request`,
        sessionId: session.id,
        role: 'user',
        content,
        timestamp,
        selectionId: selection?.id ?? null,
    };
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