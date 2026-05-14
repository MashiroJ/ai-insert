import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { delay } from '@mashiro39/ai-inspect-server';

export interface EnsureProjectDevServerOptions {
  project: string;
  openBrowser?: boolean;
  timeoutMs?: number;
}

export interface EnsureProjectDevServerResult {
  ok: boolean;
  running: boolean;
  started: boolean;
  opened: boolean;
  url: string | null;
  command: string | null;
  pid: number | null;
  warnings: string[];
}

const VITE_PORTS = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180];

export async function ensureProjectDevServer({
  project,
  openBrowser = false,
  timeoutMs = 10000,
}: EnsureProjectDevServerOptions): Promise<EnsureProjectDevServerResult> {
  const result: EnsureProjectDevServerResult = {
    ok: false,
    running: false,
    started: false,
    opened: false,
    url: null,
    command: null,
    pid: null,
    warnings: [],
  };

  const existing = await findViteServer();
  if (existing) {
    result.ok = true;
    result.running = true;
    result.url = existing;
    if (openBrowser) result.opened = openUrl(existing);
    return result;
  }

  const packageJsonFile = join(project, 'package.json');
  if (!existsSync(packageJsonFile)) {
    result.warnings.push(`package.json not found: ${project}`);
    return result;
  }

  const packageJson = JSON.parse(readFileSync(packageJsonFile, 'utf8')) as { scripts?: Record<string, string> };
  if (!packageJson.scripts?.dev) {
    result.warnings.push('package.json has no dev script');
    return result;
  }

  const lock = devServerPidFile(project);
  if (existsSync(lock)) {
    const pid = Number(readFileSync(lock, 'utf8').trim());
    if (Number.isFinite(pid) && isAlive(pid)) {
      result.ok = true;
      result.running = true;
      result.pid = pid;
      result.warnings.push('dev server process is already running, but no Vite URL was detected yet');
      return result;
    }
  }

  const command = packageManager(project);
  const args = command === 'npm' ? ['run', 'dev'] : ['dev'];
  const child = spawn(command, args, {
    cwd: project,
    detached: true,
    stdio: 'ignore',
    shell: process.platform === 'win32',
    env: packageManagerEnv(command),
  });
  child.unref();

  result.started = true;
  result.pid = child.pid ?? null;
  result.command = [command, ...args].join(' ');
  writeFileSync(lock, String(child.pid ?? ''));

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = await findViteServer();
    if (url) {
      result.ok = true;
      result.running = true;
      result.url = url;
      if (openBrowser) result.opened = openUrl(url);
      return result;
    }
    await delay(250);
  }

  result.ok = true;
  result.warnings.push('dev server was started, but no Vite URL was detected before timeout');
  return result;
}

async function findViteServer(): Promise<string | null> {
  for (const port of VITE_PORTS) {
    if (await isVitePort(port)) return `http://localhost:${port}`;
  }
  return null;
}

async function isVitePort(port: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 350);
    const resp = await fetch(`http://127.0.0.1:${port}/@vite/client`, { signal: controller.signal });
    clearTimeout(timer);
    return resp.ok;
  } catch {
    return false;
  }
}

function packageManager(project: string): string {
  const declared = packageManagerField(project);
  if (declared?.startsWith('yarn@')) return 'yarn';
  if (existsSync(join(project, 'yarn.lock'))) return 'yarn';
  if (declared?.startsWith('pnpm@')) return 'pnpm';
  if (declared?.startsWith('npm@')) return 'npm';
  if (existsSync(join(project, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(project, 'bun.lockb')) || existsSync(join(project, 'bun.lock'))) return 'bun';
  return commandExists('yarn') ? 'yarn' : 'npm';
}

function packageManagerEnv(command: string): NodeJS.ProcessEnv {
  return command === 'yarn'
    ? { ...process.env, COREPACK_ENABLE_STRICT: '0' }
    : process.env;
}

function packageManagerField(project: string): string | null {
  try {
    const packageJson = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8')) as { packageManager?: unknown };
    return typeof packageJson.packageManager === 'string' ? packageJson.packageManager : null;
  } catch {
    return null;
  }
}

function commandExists(command: string): boolean {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

function openUrl(url: string): boolean {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    const child = spawn(command, args, { detached: true, stdio: 'ignore', shell: process.platform === 'win32' });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function devServerPidFile(project: string): string {
  const dir = join(project, '.ai-insert');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, 'dev-server.pid');
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
