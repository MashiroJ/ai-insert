export declare function handleStartUiInspect(args: unknown, daemonUrl: string): Promise<unknown>;
export declare function handleGetFrontendSelection(daemonUrl: string): Promise<unknown>;
export declare function handleWaitForFrontendRequest(args: unknown, daemonUrl: string): Promise<unknown>;
export declare function handleGetFrontendSource(args: unknown, daemonUrl: string): Promise<unknown>;
export declare function handleGetFrontendSessions(daemonUrl: string): Promise<unknown>;
export declare function handleUpdateUiTaskStatus(args: unknown, daemonUrl: string): Promise<unknown>;
export declare function handleReplyToUser(args: unknown, daemonUrl: string): Promise<unknown>;
export declare function handleCompleteFrontendRequest(args: unknown, daemonUrl: string): Promise<unknown>;
export declare const TOOL_HANDLERS: {
    readonly start_ui_inspect: typeof handleStartUiInspect;
    readonly get_frontend_selection: typeof handleGetFrontendSelection;
    readonly wait_for_frontend_request: typeof handleWaitForFrontendRequest;
    readonly get_frontend_source: typeof handleGetFrontendSource;
    readonly get_frontend_sessions: typeof handleGetFrontendSessions;
    readonly update_ui_task_status: typeof handleUpdateUiTaskStatus;
    readonly reply_to_user: typeof handleReplyToUser;
    readonly complete_frontend_request: typeof handleCompleteFrontendRequest;
};
