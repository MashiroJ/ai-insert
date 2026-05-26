// Tool name to handler mapping and dispatch logic
// This file routes MCP tool calls to their respective implementations

export async function handleStartUiInspect(args: unknown, daemonUrl: string): Promise<unknown> {
  // Import dynamically to avoid circular dependencies
  const { startUiInspectHandler } = await import('./handlers/start.js');
  return startUiInspectHandler(args, daemonUrl);
}

export async function handleGetFrontendSelection(daemonUrl: string): Promise<unknown> {
  const { getFrontendSelectionHandler } = await import('./handlers/get-selection.js');
  return getFrontendSelectionHandler(daemonUrl);
}

export async function handleWaitForFrontendRequest(args: unknown, daemonUrl: string): Promise<unknown> {
  const { waitForFrontendRequestHandler } = await import('./handlers/wait.js');
  return waitForFrontendRequestHandler(args, daemonUrl);
}

export async function handleGetFrontendSource(args: unknown, daemonUrl: string): Promise<unknown> {
  const { getFrontendSourceHandler } = await import('./handlers/get-source.js');
  return getFrontendSourceHandler(args, daemonUrl);
}

export async function handleGetFrontendSessions(daemonUrl: string): Promise<unknown> {
  const { getFrontendSessionsHandler } = await import('./handlers/get-sessions.js');
  return getFrontendSessionsHandler(daemonUrl);
}

export async function handleUpdateUiTaskStatus(args: unknown, daemonUrl: string): Promise<unknown> {
  const { updateUiTaskStatusHandler } = await import('./handlers/update-status.js');
  return updateUiTaskStatusHandler(args, daemonUrl);
}

export async function handleReplyToUser(args: unknown, daemonUrl: string): Promise<unknown> {
  const { replyToUserHandler } = await import('./handlers/reply.js');
  return replyToUserHandler(args, daemonUrl);
}

export async function handleCompleteFrontendRequest(args: unknown, daemonUrl: string): Promise<unknown> {
  const { completeFrontendRequestHandler } = await import('./handlers/complete.js');
  return completeFrontendRequestHandler(args, daemonUrl);
}

// Tool handler registry
export const TOOL_HANDLERS = {
  start_ui_inspect: handleStartUiInspect,
  get_frontend_selection: handleGetFrontendSelection,
  wait_for_frontend_request: handleWaitForFrontendRequest,
  get_frontend_source: handleGetFrontendSource,
  get_frontend_sessions: handleGetFrontendSessions,
  update_ui_task_status: handleUpdateUiTaskStatus,
  reply_to_user: handleReplyToUser,
  complete_frontend_request: handleCompleteFrontendRequest,
} as const;
