import type { AiInspectMessage, AiInspectSession } from '@mashiro39/ai-inspect-protocol';
import { DEFAULT_DAEMON_URL } from '@mashiro39/ai-inspect-protocol';
import { fetchSessions, postMessage, delay } from '@mashiro39/ai-inspect-server';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface RunWatchOptions {
  daemonUrl?: string;
  project?: string;
  agent?: string;
  intervalMs?: number;
}

type AgentKind = 'codex' | 'claude';
type AgentEvent =
  | { type: 'text_delta'; delta: string }
  | { type: 'status'; text: string }
  | { type: 'error'; text: string };

const seen = new Set<string>();
let running = false;

export async function runWatch(options: RunWatchOptions = {}): Promise<void> {
  const daemonUrl = options.daemonUrl ?? DEFAULT_DAEMON_URL;
  const project = options.project ?? process.cwd();
  const agent = normalizeAgent(options.agent ?? 'codex');
  const intervalMs = options.intervalMs ?? 1000;
  if (!acquireWatcherLock(project, daemonUrl)) return;

  process.stdout.write(`ai-inspect watch listening for browser requests at ${daemonUrl}\n`);
  process.stdout.write(`project: ${project}\n`);
  process.stdout.write(`agent: ${agent}\n`);
  if (agent === 'codex') process.stdout.write(`codex transport: ${codexTransportMode()}\n`);

  let initialized = false;
  while (true) {
    try {
      const payload = await fetchSessions(daemonUrl);
      if (!initialized) {
        markExistingUserMessagesSeen(payload.sessions);
        initialized = true;
        await delay(intervalMs);
        continue;
      }
      const messages = collectPendingUserMessages(payload.sessions);
      for (const item of messages) {
        if (running) continue;
        if (!claimMessage(project, item.message.id)) continue;
        try {
          running = true;
          await runAgent({ agent, project, daemonUrl, session: item.session, message: item.message });
        } finally {
          running = false;
        }
      }
    } catch (err) {
      process.stderr.write(`ai-inspect watch: ${err instanceof Error ? err.message : String(err)}\n`);
    }
    await delay(intervalMs);
  }
}

function collectPendingUserMessages(sessions: AiInspectSession[]): Array<{ session: AiInspectSession; message: AiInspectMessage }> {
  const pending: Array<{ session: AiInspectSession; message: AiInspectMessage }> = [];
  for (const session of sessions.slice().reverse()) {
    for (const message of session.messages) {
      if (message.role !== 'user') continue;
      if (seen.has(message.id)) continue;
      seen.add(message.id);
      pending.push({ session, message });
    }
  }
  return pending;
}

function markExistingUserMessagesSeen(sessions: AiInspectSession[]): void {
  for (const session of sessions) {
    for (const message of session.messages) {
      if (message.role === 'user') seen.add(message.id);
    }
  }
}

async function runAgent(input: { agent: AgentKind; project: string; daemonUrl: string; session: AiInspectSession; message: AiInspectMessage }): Promise<void> {
  const prompt = buildPrompt(input.agent, input.session, input.message);
  const logFile = join(aiInspectDir(input.project), `${input.message.id}.log`);
  writeFileSync(logFile, '');

  await postMessage(`AI 已启动（${input.agent}），正在读取页面选择...\n`, 'assistant', input.daemonUrl, { mode: 'append' });

  const child = spawnAgent(input.agent, input.project);
  const appendLog = (text: string) => appendFileSync(logFile, text);
  const parser = createAgentParser(input.agent, async (event) => {
    if (event.type === 'text_delta') {
      await postMessage(event.delta, 'assistant', input.daemonUrl, { mode: 'append' });
    } else if (event.type === 'status') {
      await postMessage(`\n${event.text}\n`, 'assistant', input.daemonUrl, { mode: 'append' });
    } else if (isTransientAgentError(event.text)) {
      // Codex can emit retry noise during a network blip. It is kept in the log file,
      // but the browser panel should only show user-relevant progress and final errors.
      return;
    } else {
      await postMessage(`\nAI 执行错误：${event.text}\n日志：.ai-insert/${input.message.id}.log`, 'assistant', input.daemonUrl, { mode: 'append' });
    }
  });

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    const text = String(chunk);
    appendLog(text);
    parser.feed(text);
  });
  child.stderr.on('data', (chunk) => {
    const text = String(chunk);
    appendLog(text);
  });

  child.stdin.end(prompt);
  const code = await waitForChild(child, 10 * 60_000);
  parser.flush();

  if (code === 'timeout') {
    await postMessage(`\nAI 后台任务长时间没有输出，已停止。日志：.ai-insert/${input.message.id}.log`, 'assistant', input.daemonUrl, { mode: 'append' });
    return;
  }
  if (code !== 0) {
    await postMessage(`\nAI 后台任务失败，退出码：${code ?? 'unknown'}。日志：.ai-insert/${input.message.id}.log`, 'assistant', input.daemonUrl, { mode: 'append' });
    return;
  }
  await postMessage('\n\nAI 已完成。还需要继续调整吗？', 'assistant', input.daemonUrl, { mode: 'append' });
}

function spawnAgent(agent: AgentKind, project: string): ChildProcessWithoutNullStreams {
  if (agent === 'claude') {
    return spawn('claude', [
      '-p',
      '--output-format', 'stream-json',
      '--verbose',
      '--permission-mode', 'acceptEdits',
      '--allowedTools', [
        'mcp__ai-inspect__get_frontend_selection',
        'mcp__ai-inspect__get_frontend_source',
        'mcp__ai-inspect__get_frontend_sessions',
        'Read',
        'Edit',
        'MultiEdit',
        'Write',
        'Glob',
        'Grep',
      ].join(','),
    ], {
      cwd: project,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: agentEnv(),
    });
  }
  return spawn('codex', [
    'exec',
    '--json',
    '--skip-git-repo-check',
    '--sandbox', 'workspace-write',
    '-c', 'sandbox_workspace_write.network_access=true',
    ...codexTransportArgs(),
    '-C', project,
  ], {
    cwd: project,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: agentEnv(),
  });
}

function codexTransportMode(): 'default' | 'http' {
  return process.env.AI_INSPECT_CODEX_TRANSPORT === 'default' ? 'default' : 'http';
}

function codexTransportArgs(): string[] {
  if (codexTransportMode() === 'default') return [];
  return [
    '-c', 'model_provider="openai-http"',
    '-c', 'model_providers.openai-http={name="OpenAI HTTP", base_url="https://chatgpt.com/backend-api/codex", wire_api="responses", requires_openai_auth=true, supports_websockets=false, request_max_retries=4, stream_max_retries=1, stream_idle_timeout_ms=300000}',
  ];
}

function agentEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  const httpProxy = env.HTTP_PROXY || env.http_proxy || null;
  const httpsProxy = env.HTTPS_PROXY || env.https_proxy || httpProxy;

  if (httpProxy) {
    env.HTTP_PROXY = httpProxy;
    env.http_proxy = httpProxy;
  }
  if (httpsProxy) {
    env.HTTPS_PROXY = httpsProxy;
    env.https_proxy = httpsProxy;
  }

  const allProxy = env.ALL_PROXY || env.all_proxy || '';
  if (/^socks/i.test(allProxy) && (httpProxy || httpsProxy)) {
    delete env.ALL_PROXY;
    delete env.all_proxy;
  }

  const noProxy = mergeNoProxy(env.NO_PROXY || env.no_proxy || '');
  env.NO_PROXY = noProxy;
  env.no_proxy = noProxy;
  return env;
}

function mergeNoProxy(value: string): string {
  const required = ['localhost', '127.0.0.1', '::1'];
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  for (const item of required) {
    if (!parts.some((part) => part.toLowerCase() === item.toLowerCase())) parts.push(item);
  }
  return parts.join(',');
}

function createAgentParser(agent: AgentKind, onEvent: (event: AgentEvent) => Promise<void>): { feed(chunk: string): void; flush(): void } {
  let buffer = '';
  let claudeTextEmitted = false;
  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let value: unknown;
    try {
      value = JSON.parse(trimmed);
    } catch {
      return;
    }
    const event = agent === 'claude' ? parseClaudeEvent(value, claudeTextEmitted) : parseCodexEvent(value);
    if (event?.type === 'text_delta' && agent === 'claude') claudeTextEmitted = true;
    if (event) void onEvent(event);
  };
  return {
    feed(chunk: string) {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) handleLine(line);
    },
    flush() {
      if (buffer.trim()) handleLine(buffer);
      buffer = '';
    },
  };
}

function parseCodexEvent(value: unknown): AgentEvent | null {
  if (!isRecord(value)) return null;
  if (value.type === 'item.completed' && isRecord(value.item)) {
    const item = value.item;
    if (item.type === 'agent_message' && typeof item.text === 'string' && item.text) {
      return { type: 'text_delta', delta: item.text };
    }
    if (item.type === 'command_execution' && typeof item.command === 'string') {
      return { type: 'status', text: `执行命令：${item.command}` };
    }
  }
  if (value.type === 'error' && typeof value.message === 'string') return { type: 'error', text: value.message };
  return null;
}

function parseClaudeEvent(value: unknown, textAlreadyEmitted: boolean): AgentEvent | null {
  if (!isRecord(value)) return null;
  if (value.type === 'assistant' && isRecord(value.message) && Array.isArray(value.message.content)) {
    const text = value.message.content
      .map((part) => isRecord(part) && part.type === 'text' && typeof part.text === 'string' ? part.text : '')
      .join('');
    return text ? { type: 'text_delta', delta: text } : null;
  }
  if (value.type === 'content_block_delta' && isRecord(value.delta) && typeof value.delta.text === 'string') {
    return { type: 'text_delta', delta: value.delta.text };
  }
  if (value.type === 'result' && typeof value.result === 'string' && !textAlreadyEmitted) return { type: 'text_delta', delta: value.result };
  if (value.type === 'error' && typeof value.message === 'string') return { type: 'error', text: value.message };
  return null;
}

function buildPrompt(agent: AgentKind, session: AiInspectSession, message: AiInspectMessage): string {
  const file = session.selection?.source.file ?? '(unknown source file)';
  return [
    `你是被 ai-inspect watcher 自动触发的 ${agent} 任务。`,
    '用户刚刚在浏览器里选择了一个前端元素并发送了修改需求。',
    '',
    '必须执行的流程：',
    '1. 使用 ai-inspect MCP 读取最新 frontend selection。',
    '2. 使用 ai-inspect MCP 读取对应 source。',
    '如果 MCP 工具不可用或被拒绝，不要猜测 DOM；直接报告工具不可用和日志位置。',
    '3. 根据用户需求修改代码；如果用户明确要求只回复测试文本，则不要改代码。',
    '4. 最终回复要简短说明结果，并询问是否继续调整。',
    '5. 不要调用 ai-inspect reply_to_user，watcher 会自动把你的输出实时回写到浏览器面板。',
    '6. 不要运行测试，除非用户明确要求。',
    '',
    `sessionId: ${session.id}`,
    `messageId: ${message.id}`,
    `sourceHint: ${file}`,
    `userInstruction: ${message.content}`,
  ].join('\n');
}

function normalizeAgent(value: string): AgentKind {
  return value === 'claude' ? 'claude' : 'codex';
}

function aiInspectDir(project: string): string {
  const dir = join(project, '.ai-insert');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function claimMessage(project: string, messageId: string): boolean {
  const dir = join(aiInspectDir(project), 'claims');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = join(dir, `${safeName(messageId)}.lock`);
  try {
    const fd = openSync(file, 'wx');
    writeFileSync(fd, `${process.pid}\n${new Date().toISOString()}\n`);
    closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

function acquireWatcherLock(project: string, daemonUrl: string): boolean {
  const dir = aiInspectDir(project);
  const file = join(dir, `watcher-${safeName(daemonUrl)}.pid`);
  if (existsSync(file)) {
    const existing = Number(readFileSync(file, 'utf8').trim());
    if (Number.isFinite(existing) && isProcessAlive(existing)) {
      process.stdout.write(`ai-inspect watch already running with pid ${existing}\n`);
      return false;
    }
  }
  writeFileSync(file, String(process.pid));
  return true;
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]+/g, '_');
}

function isTransientAgentError(text: string): boolean {
  return text.startsWith('Reconnecting...')
    || /stream disconnected before completion/i.test(text)
    || /tls handshake eof/i.test(text);
}

function waitForChild(child: ChildProcessWithoutNullStreams, timeoutMs: number): Promise<number | null | 'timeout'> {
  return new Promise((resolve) => {
    let done = false;
    let lastActivity = Date.now();
    const markActivity = () => { lastActivity = Date.now(); };
    child.stdout.on('data', markActivity);
    child.stderr.on('data', markActivity);
    const timer = setInterval(() => {
      if (done) return;
      if (Date.now() - lastActivity < timeoutMs) return;
      done = true;
      clearInterval(timer);
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }
      resolve('timeout');
    }, 1000);
    child.on('close', (code) => {
      if (done) return;
      done = true;
      clearInterval(timer);
      resolve(code);
    });
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && !Array.isArray(value) && typeof value === 'object';
}
