import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const project = valueAfter('--project') || process.cwd();
const candidates = [
  'vite.config.ts',
  'vite.config.mts',
  'vite.config.js',
  'vite.config.mjs',
];
const configFile = candidates.map((name) => join(project, name)).find((file) => existsSync(file));

if (!configFile) {
  console.log('未找到 vite.config 文件。请手动添加：');
  printManualSnippet();
  process.exit(0);
}

let content = readFileSync(configFile, 'utf8');
content = content.replace(/^import\s+\{\s*aiInspect\s*\}\s+from\s+['"]@ai-inspect\/vite-plugin['"];\s*\n?/gm, '');
if (content.includes('@mashiro39/ai-inspect-vite-plugin') && /\baiInspect\s*\(/.test(content)) {
  console.log('Vite 配置已包含 aiInspect(): ' + configFile);
  process.exit(0);
}

if (!content.includes('@mashiro39/ai-inspect-vite-plugin')) {
  const importLine = "import { aiInspect } from '@mashiro39/ai-inspect-vite-plugin';\n";
  const importMatches = [...content.matchAll(/^import\s.+?;\s*$/gm)];
  if (importMatches.length > 0) {
    const last = importMatches[importMatches.length - 1];
    const insertAt = (last.index || 0) + last[0].length;
    content = content.slice(0, insertAt) + '\n' + importLine.trimEnd() + content.slice(insertAt);
  } else {
    content = importLine + content;
  }
}

if (!/\baiInspect\s*\(/.test(content)) {
  const pluginsMatch = content.match(/plugins\s*:\s*\[/);
  if (!pluginsMatch || pluginsMatch.index === undefined) {
    console.log('已安装依赖，但未能自动找到 plugins 数组。请手动添加：');
    writeFileSync(configFile, content);
    printManualSnippet();
    process.exit(0);
  }
  const insertAt = pluginsMatch.index + pluginsMatch[0].length;
  content = content.slice(0, insertAt) + 'aiInspect(), ' + content.slice(insertAt);
}

writeFileSync(configFile, content);
console.log('已自动接入 Vite 插件: ' + configFile);
console.log('启动项目后，页面右下角应出现「AI 调试」按钮。');

function valueAfter(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function printManualSnippet() {
  console.log("\nimport { aiInspect } from '@mashiro39/ai-inspect-vite-plugin';\n\nexport default defineConfig({\n  plugins: [vue(), aiInspect()],\n});\n");
}
