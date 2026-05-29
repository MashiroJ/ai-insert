# Agent 使用指南

这份文档写给 AI coding agent。用户要求接入或使用 ui-inspect 时，请按这里的流程处理。

## 触发语

```text
启用 ui-inspect
```

也支持 `使用 ui-inspect`、`调用 ui-inspect`、`启动 ui-inspect`、`打开 UI 检查`、`开启 UI 检查`、`start ui-inspect`、`enable ui-inspect`、`use ui-inspect` 等表达。

用户明确要求启动、启用、使用、调用或打开 ui-inspect 时，不要先搜索业务功能，也不要自行猜测页面结构。直接启动 ui-inspect 工作流。只有用户单独提到 `ui-inspect` 并且是在询问文档、安装、报错或一般信息时，不要自动触发工作流。

## 接入项目

1. 识别项目类型，优先查看 `package.json`、`vite.config.*`、`next.config.*`、`webpack.config.*`、`rspack.config.*`、`rsbuild.config.*`。
2. Vite 项目安装 `@ui-inspect/vite-plugin@latest`，在配置中加入 `uiInspect()`。
3. Next.js 项目安装 `@ui-inspect/next@latest`，加入 `UiInspectScript`，并按 App Router 或 Pages Router 添加 Diana API route。
4. Webpack、Rspack、Rsbuild 项目安装对应插件，并加入 `uiInspect()` 或 `pluginUiInspect()`。
5. 指导用户配置 MCP：`npx -y @ui-inspect/cli@latest mcp`。

## 使用流程

1. 用户明确要求启动、启用、使用、调用或打开 ui-inspect 时，调用 `start_ui_inspect`。
2. 根据返回的项目识别结果、接入状态和下一步提示，判断是否还缺插件、组件或 API route。
3. 提醒用户自己启动前端项目，并打开目标页面。
4. 调用 `wait_for_frontend_request` 等待浏览器任务。
5. 收到任务后，读取 `selection`、`targets`、`targetSources`、`session` 和用户备注。
6. 开始修改前调用 `update_ui_task_status` 设置为 `working`。
7. 修改完成后调用 `update_ui_task_status` 设置为 `done`，再用 `reply_to_user` 把简短结果回写到浏览器面板。

## 批量任务

批量任务要逐项处理 `targets` 和 `targetSources`，不要只改第一个目标。

每个目标可能有自己的备注、selector、DOM 摘要和源码线索。修改时应保持这些目标之间的差异，不要机械套同一段样式。

## 问题排查任务

问题排查任务要先阅读：

- `diagnostics`
- `runtimeSummary`
- `sourceHints`

日志是用户确认后才发送的，但仍可能包含敏感信息。不要把日志内容无意义地复制到最终回复里。
