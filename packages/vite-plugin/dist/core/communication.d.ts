/**
 * Communication Layer
 *
 * Handles Server-Sent Events (SSE) connection with the daemon.
 */
export interface CommunicationOptions {
    daemonUrl: string;
    onMessage?: (data: unknown) => void;
    onError?: (error: Error) => void;
    onOpen?: () => void;
    onClose?: () => void;
}
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
/**
 * SSE Communication Manager
 */
export declare class SSEConnection {
    private options;
    private eventSource;
    private state;
    private reconnectTimer;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    constructor(options: CommunicationOptions);
    /**
     * Get current connection state
     */
    getState(): ConnectionState;
    /**
     * Check if connected
     */
    isConnected(): boolean;
    /**
     * Connect to the daemon
     */
    connect(): void;
    /**
     * Disconnect from the daemon
     */
    disconnect(): void;
    /**
     * Schedule a reconnection attempt
     */
    private scheduleReconnect;
    /**
     * Cancel scheduled reconnection
     */
    private cancelReconnect;
    /**
     * Send data to the daemon via POST request
     */
    send(path: string, data: unknown): Promise<unknown>;
    /**
     * Destroy the connection
     */
    destroy(): void;
}
/**
 * Session stream manager
 */
export declare class SessionStreamManager {
    private options;
    private connection;
    private sessionId;
    constructor(options: CommunicationOptions);
    /**
     * Start streaming session updates
     */
    start(sessionId: string): void;
    /**
     * Stop streaming
     */
    stop(): void;
    /**
     * Check if streaming
     */
    isStreaming(): boolean;
    /**
     * Get current session ID
     */
    getSessionId(): string | null;
    /**
     * Send message to session
     */
    sendMessage(message: {
        content: string;
    }): Promise<unknown>;
    /**
     * Update task status
     */
    updateStatus(status: 'draft' | 'sent' | 'claimed' | 'working' | 'done' | 'failed'): Promise<unknown>;
    /**
     * Destroy the manager
     */
    destroy(): void;
}
/**
 * HTTP client for daemon API
 */
export declare class DaemonClient {
    private baseUrl;
    constructor(baseUrl: string);
    /**
     * GET request
     */
    get(path: string): Promise<unknown>;
    /**
     * POST request
     */
    post(path: string, data: unknown): Promise<unknown>;
    /**
     * PUT request
     */
    put(path: string, data: unknown): Promise<unknown>;
    /**
     * DELETE request
     */
    delete(path: string): Promise<unknown>;
    /**
     * Check daemon health
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get current selection
     */
    getSelection(): Promise<unknown>;
    /**
     * Get all sessions
     */
    getSessions(): Promise<unknown>;
    /**
     * Create a new session
     */
    createSession(data: unknown): Promise<unknown>;
    /**
     * Update a session
     */
    updateSession(sessionId: string, data: unknown): Promise<unknown>;
    /**
     * Delete a session
     */
    deleteSession(sessionId: string): Promise<unknown>;
    /**
     * Get source code context
     */
    getSource(params: {
        file: string;
        line?: number;
        context?: number;
    }): Promise<unknown>;
}
export {};
