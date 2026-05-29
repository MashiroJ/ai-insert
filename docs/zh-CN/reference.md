# MCP 与 CLI 参考

## MCP Tools

### `start_ui_inspect`

启动或检查 ui-inspect 工作流。

它会：

- 启动或复用本地 daemon。
- 检测当前项目类型和可用接入方式。
- 返回 daemon 状态、项目识别结果、接入状态和建议下一步。

Next.js 项目会返回 App Router / Pages Router 识别结果、缺失项和接入片段。Next 项目不会被自动 patch，工具会告诉 agent 需要补哪些文件。

它不会：

- 启动用户项目 dev server。
- 打开或刷新浏览器。
- 启动任何固定 agent。

### `wait_for_frontend_request`

等待用户在浏览器中选择元素并点击发送。默认最多等待 10 分钟。

成功后通常返回：

- 用户整体需求
- 当前 session
- 当前 selection
- 多个 targets
- 每个目标的备注
- 相关源码上下文
- 元素上下文摘要
- 批量目标摘要
- 源码候选线索
- 用户确认过的运行时日志摘要

### `get_frontend_selection`

读取当前浏览器选中的前端元素。

常见内容包括页面 URL、CSS selector、DOM 快照、元素尺寸、计算样式、父级/同级/子级摘要、表单和可访问名称线索、框架组件信息、源码线索和用户输入需求。

### `get_frontend_source`

根据 selection 的源码线索读取附近代码。

```json
{
  "context": 80
}
```

### `get_frontend_sessions`

读取最近的浏览器任务记录和消息历史。

### `update_ui_task_status`

更新浏览器面板里的任务状态。

```json
{
  "status": "working"
}
```

支持状态：

```text
claimed
working
done
failed
```

### `reply_to_user`

把 AI 的简短回复写回浏览器面板。

```json
{
  "content": "已修改按钮样式，并保留了现有交互。"
}
```

## CLI

普通用户通常只需要：

```bash
npx -y @ui-inspect/cli@latest mcp
```

全局安装后：

```bash
ui-inspect mcp
```

调试命令：

```bash
ui-inspect daemon
ui-inspect status
ui-inspect selection --json
ui-inspect wait --response-mode compact
ui-inspect task-status --status working
ui-inspect source --context 80
ui-inspect sessions
ui-inspect reply --content "已完成"
ui-inspect complete --session-id <id> --after-request-id <id> --content "已完成"
ui-inspect clear
```

## 本地数据

会话历史保存在目标项目：

```text
<project>/.ui-inspect/sessions.json
```

`.ui-inspect/` 是本地调试状态目录，通常不需要提交到 git。

```gitignore
.ui-inspect/
```

Diana 的浏览器位置保存在当前页面的 `localStorage` 中。
