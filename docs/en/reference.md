# MCP and CLI Reference

## MCP Tools

### `start_ui_inspect`

Starts or checks the ui-inspect workflow.

It will:

- Start or reuse the local daemon.
- Detect the current project type and available integration path.
- Return daemon status, project detection, integration status, and suggested next steps.

For Next.js projects, it returns App Router / Pages Router detection, missing items, and setup snippets. Next projects are not patched automatically; the tool tells the agent what files are missing.

It will not:

- Start the user project dev server.
- Open or refresh the browser.
- Start any fixed AI agent.

### `wait_for_frontend_request`

Waits for the user to select elements in the browser and send a task. The default timeout is 10 minutes.

Successful responses usually include:

- Overall user request
- Current session
- Current selection
- Multiple targets
- Notes per target
- Related source context
- Element context summary
- Batch target summary
- Source candidates
- User-confirmed runtime diagnostics
- CSS debug context

### `get_frontend_selection`

Reads the current frontend selection from the browser.

Common fields include page URL, CSS selector, DOM snapshot, element size, computed styles, parent/sibling/child summaries, form and accessible-name hints, framework component information, source hints, and user input.

### `get_frontend_source`

Reads nearby source code based on selection source hints.

```json
{
  "context": 80
}
```

### `get_frontend_sessions`

Reads recent debug sessions and message history.

### `update_ui_task_status`

Updates the task status shown in the browser panel.

```json
{
  "status": "working"
}
```

Supported statuses:

```text
claimed
working
done
failed
```

### `reply_to_user`

Writes a short AI response back to the browser panel.

```json
{
  "content": "Updated the button style while preserving the existing interaction."
}
```

## CLI

Most users only need:

```bash
npx -y @ui-inspect/cli@latest mcp
```

After global installation:

```bash
ui-inspect mcp
```

Debug commands:

```bash
ui-inspect daemon
ui-inspect status
ui-inspect selection --json
ui-inspect source --context 80
ui-inspect sessions
ui-inspect reply --content "Done"
ui-inspect clear
```

## Local Data

Session history is stored in the target project:

```text
<project>/.ui-inspect/sessions.json
```

`.ui-inspect/` is local debug state and usually should not be committed.

```gitignore
.ui-inspect/
```

Diana position is stored in the current page's `localStorage`.
