# ai-inspect release 0.2.1

ai-inspect 是一个通用 MCP 前端检查上下文服务。

这个目录只包含 npm tgz 包和说明文档，不再提供内部安装脚本。普通用户推荐直接从 npm 安装最新版；只有离线、本地验证或发布检查时，才需要使用这里的 tgz 包。

## 推荐安装方式

### MCP client 配置

推荐使用 npm 最新版：

```json
{
  "mcpServers": {
    "ai-inspect": {
      "command": "npx",
      "args": ["-y", "@mashiro39/ai-inspect-cli@latest", "mcp"]
    }
  }
}
```

TOML：

```toml
[mcp_servers.ai-inspect]
type = "stdio"
command = "npx"
args = ["-y", "@mashiro39/ai-inspect-cli@latest", "mcp"]
```

也可以全局安装：

```bash
npm install -g @mashiro39/ai-inspect-cli@latest
```

然后配置：

```json
{
  "mcpServers": {
    "ai-inspect": {
      "command": "ai-inspect",
      "args": ["mcp"]
    }
  }
}
```

### Vite / Vue 项目接入

```bash
npm install -D @mashiro39/ai-inspect-vite-plugin@latest
```

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { aiInspect } from '@mashiro39/ai-inspect-vite-plugin';

export default defineConfig({
  plugins: [vue(), aiInspect()],
});
```

## 本地 tgz 安装

如果你需要使用当前 release 目录里的 tgz 包：

```bash
npm install -g ./mashiro39-ai-inspect-protocol-0.2.1.tgz ./mashiro39-ai-inspect-server-0.2.1.tgz ./mashiro39-ai-inspect-cli-0.2.1.tgz
npm install -D ./mashiro39-ai-inspect-protocol-0.2.1.tgz ./mashiro39-ai-inspect-vite-plugin-0.2.1.tgz
```

第一条命令用于安装 MCP CLI；第二条命令需要在目标 Vite 项目目录里执行。

## 使用

在 AI coding agent 对话里输入：

```text
启用 ai-insert
```

agent 应调用 `start_ai_inspect`，再调用 `wait_for_frontend_request` 等待用户在浏览器面板里选择元素并点击发送。
