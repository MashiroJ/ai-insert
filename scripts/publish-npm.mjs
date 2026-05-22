import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cliArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const args = new Set(cliArgs);
const yes = args.has('--yes');
const skipChecks = args.has('--skip-checks');
const otp = valueAfter('--otp');
const registry = valueAfter('--registry') || 'https://registry.npmjs.org';
const tag = valueAfter('--tag') || 'latest';

const packages = [
  '@ui-inspect/protocol',
  '@ui-inspect/shared',
  '@ui-inspect/browser-adapter',
  '@ui-inspect/browser-ui',
  '@ui-inspect/server',
  '@ui-inspect/vite-plugin',
  '@ui-inspect/webpack-plugin',
  '@ui-inspect/cli',
];

if (args.has('--help') || args.has('-h')) {
  printHelp();
  process.exit(0);
}

const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;

console.log(`ui-inspect npm publish helper`);
console.log(`version: ${version}`);
console.log(`registry: ${registry}`);
console.log(`mode: ${yes ? 'publish' : 'dry-run'}`);

assertPublishBranch();

if (!skipChecks) {
  run('npm', ['whoami', '--registry', registry], root);
  run('pnpm', ['run', 'check:versions'], root);
  run('pnpm', ['run', 'check:public-docs'], root);
  run('pnpm', ['run', 'check:release-clean'], root);
  run('pnpm', ['run', 'test'], root);
  run('pnpm', ['run', 'typecheck'], root);
  run('pnpm', ['release:local'], root);
}

for (const pkg of packages) {
  const published = npmViewVersion(pkg);
  if (published === version && yes) {
    throw new Error(`${pkg}@${version} is already published. Bump versions before publishing again.`);
  }
  if (published === version) {
    console.log(`${pkg}@${version} already exists; dry-run will still check package contents.`);
  }
  const publishArgs = [
    '--filter', pkg,
    'publish',
    '--access', 'public',
    '--no-git-checks',
    '--registry', registry,
    '--tag', tag,
  ];
  if (!yes) publishArgs.push('--dry-run');
  if (otp) publishArgs.push('--otp', otp);
  run('pnpm', publishArgs, root);
}

if (yes) {
  console.log('Verifying published packages...');
  for (const pkg of packages) {
    const published = await npmViewVersionWithRetry(pkg);
    if (published !== version) throw new Error(`${pkg} published version mismatch: expected ${version}, got ${published || '(not found)'}`);
    console.log(`${pkg}@${published}`);
  }
}

console.log(yes ? 'Publish complete.' : 'Dry-run complete. Re-run with --yes to publish.');

function valueAfter(name) {
  const index = cliArgs.indexOf(name);
  return index >= 0 ? cliArgs[index + 1] : null;
}

function assertPublishBranch() {
  const result = spawnSync('git', ['branch', '--show-current'], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) throw new Error(`git branch --show-current failed: ${result.stderr || result.stdout}`);

  const branch = result.stdout.trim();
  if (branch === 'main' || branch.startsWith('release/')) return;

  throw new Error(`Refusing to publish from branch "${branch || '(detached)'}". Use release/vX.Y.Z or main.`);
}

function npmViewVersion(pkg) {
  const result = spawnSync('npm', ['view', `${pkg}@${version}`, 'version', '--registry', registry], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.status === 0) return result.stdout.trim();
  if (/E404|404 Not Found/i.test(`${result.stdout}\n${result.stderr}`)) return null;
  throw new Error(`npm view failed for ${pkg}: ${result.stderr || result.stdout}`);
}

async function npmViewVersionWithRetry(pkg) {
  const attempts = 8;
  for (let i = 0; i < attempts; i += 1) {
    const version = npmViewVersion(pkg);
    if (version) return version;
    await delay(1500);
  }
  return null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(command, runArgs, cwd) {
  console.log(`\n$ ${command} ${runArgs.join(' ')}`);
  const result = spawnSync(command, runArgs, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) throw new Error(`${command} ${runArgs.join(' ')} failed with exit ${result.status}`);
}

function printHelp() {
  console.log(`Usage:
  pnpm run publish:npm:dry-run
  pnpm run publish:npm
  node scripts/publish-npm.mjs [--yes] [--skip-checks] [--otp <code>] [--tag latest] [--registry https://registry.npmjs.org]

Default mode is dry-run. Use --yes to publish.
Publishing is allowed only from main or release/* branches.
`);
}
