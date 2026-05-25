import { DEFAULT_DAEMON_PORT } from '@ui-inspect/protocol';
import { fetchHealth, shutdownDaemon } from '@ui-inspect/server';
import { spawn } from 'node:child_process';
import { getVersion } from './version.js';

const CONSECUTIVE_HEALTH_CHECKS = 2;
const HEALTH_CHECK_INTERVAL_MS = 100;

export interface EnsureDaemonOptions {
  daemonUrl: string;
  project?: string;
  timeoutMs?: number;
}

export interface EnsureDaemonWarning {
  versionMismatch: true;
  cliVersion: string;
  daemonVersion: string;
  daemonUrl: string;
}

export interface EnsureDaemonResult {
  warnings?: EnsureDaemonWarning[];
}

export async function ensureDaemon({ daemonUrl, project, timeoutMs = 2500 }: EnsureDaemonOptions): Promise<EnsureDaemonResult> {
  const parsed = parseLocalDaemonUrl(daemonUrl);
  if (!parsed) {
    // Non-local daemon: cannot auto-start, try health check
    if (await isHealthyWithRetry(daemonUrl, CONSECUTIVE_HEALTH_CHECKS, HEALTH_CHECK_INTERVAL_MS)) {
      // Non-local daemon is healthy — check version
      const cliVersion = getVersion();
      try {
        const health = await fetchHealth(daemonUrl);
        if (health.version !== cliVersion) {
          return {
            warnings: [{
              versionMismatch: true,
              cliVersion,
              daemonVersion: health.version,
              daemonUrl,
            }],
          };
        }
      } catch { /* ignore */ }
      return {};
    }
    throw new Error(`ui-inspect daemon is not running at ${daemonUrl}. Auto-start only supports localhost daemon URLs.`);
  }

  if (await isHealthyWithRetry(daemonUrl, CONSECUTIVE_HEALTH_CHECKS, HEALTH_CHECK_INTERVAL_MS)) {
    const warning = await checkVersionAndRestart(daemonUrl, parsed, project, timeoutMs);
    if (warning) return { warnings: [warning] };
    return {};
  }

  await spawnAndWait(daemonUrl, parsed, project, timeoutMs);
  return {};
}

async function checkVersionAndRestart(
  daemonUrl: string,
  parsed: { host: string; port: number },
  project?: string,
  timeoutMs = 2500,
): Promise<EnsureDaemonWarning | null> {
  const cliVersion = getVersion();
  let daemonVersion: string;
  try {
    const health = await fetchHealth(daemonUrl);
    daemonVersion = health.version;
  } catch {
    return null;
  }

  if (daemonVersion === cliVersion) return null;

  // Version mismatch: attempt shutdown + restart for local daemon
  try {
    await shutdownDaemon(daemonUrl);
  } catch {
    // Shutdown failed — leave running, return warning
    return {
      versionMismatch: true,
      cliVersion,
      daemonVersion,
      daemonUrl,
    };
  }

  try {
    await delay(100);
    await spawnAndWait(daemonUrl, parsed, project, timeoutMs);
    // Restart succeeded, verify version now matches
    try {
      const health = await fetchHealth(daemonUrl);
      if (health.version === cliVersion) return null;
    } catch { /* ignore */ }
    return {
      versionMismatch: true,
      cliVersion,
      daemonVersion,
      daemonUrl,
    };
  } catch {
    return {
      versionMismatch: true,
      cliVersion,
      daemonVersion,
      daemonUrl,
    };
  }
}

async function spawnAndWait(
  daemonUrl: string,
  parsed: { host: string; port: number },
  project?: string,
  timeoutMs = 2500,
): Promise<void> {
  const entry = process.argv[1];
  spawn(process.execPath, [entry, 'daemon', '--host', parsed.host, '--port', String(parsed.port)], {
    cwd: project ?? process.cwd(),
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      UI_INSPECT_PROJECT: project ?? process.cwd(),
    },
  }).unref();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isHealthyWithRetry(daemonUrl, CONSECUTIVE_HEALTH_CHECKS, HEALTH_CHECK_INTERVAL_MS)) return;
    await delay(HEALTH_CHECK_INTERVAL_MS);
  }

  throw new Error(`ui-inspect daemon did not become ready at ${daemonUrl}`);
}

async function isHealthyWithRetry(daemonUrl: string, attempts: number, intervalMs: number): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (!(await isHealthy(daemonUrl))) return false;
    if (i < attempts - 1) await delay(intervalMs);
  }
  return true;
}

async function isHealthy(daemonUrl: string): Promise<boolean> {
  try {
    const health = await fetchHealth(daemonUrl);
    return health.ok === true;
  } catch {
    return false;
  }
}

function parseLocalDaemonUrl(daemonUrl: string): { host: string; port: number } | null {
  let url: URL;
  try {
    url = new URL(daemonUrl);
    if (url.protocol !== 'http:') {
      return null;
    }
  } catch {
    return null;
  }

  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname)) return null;

  return {
    host: url.hostname === 'localhost' ? '127.0.0.1' : url.hostname.replace(/^\[(.*)\]$/, '$1'),
    port: url.port ? Number(url.port) : DEFAULT_DAEMON_PORT,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
