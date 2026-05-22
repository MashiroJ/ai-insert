/**
 * Communication Layer
 *
 * Handles Server-Sent Events (SSE) connection with the daemon.
 */
/**
 * SSE Communication Manager
 */
export class SSEConnection {
    options;
    eventSource = null;
    state = 'disconnected';
    reconnectTimer = null;
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    reconnectDelay = 1000;
    constructor(options) {
        this.options = options;
    }
    /**
     * Get current connection state
     */
    getState() {
        return this.state;
    }
    /**
     * Check if connected
     */
    isConnected() {
        return this.state === 'connected';
    }
    /**
     * Connect to the daemon
     */
    connect() {
        if (this.state === 'connected' || this.state === 'connecting') {
            return;
        }
        this.state = 'connecting';
        try {
            this.eventSource = new EventSource(this.options.daemonUrl);
            this.eventSource.onopen = () => {
                this.state = 'connected';
                this.reconnectAttempts = 0;
                this.options.onOpen?.();
            };
            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.options.onMessage?.(data);
                }
                catch (error) {
                    this.options.onError?.(error);
                }
            };
            this.eventSource.onerror = (error) => {
                this.state = 'error';
                this.options.onError?.(new Error('SSE connection error'));
                // Attempt reconnection
                this.scheduleReconnect();
            };
        }
        catch (error) {
            this.state = 'error';
            this.options.onError?.(error);
            this.scheduleReconnect();
        }
    }
    /**
     * Disconnect from the daemon
     */
    disconnect() {
        this.cancelReconnect();
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.state = 'disconnected';
        this.options.onClose?.();
    }
    /**
     * Schedule a reconnection attempt
     */
    scheduleReconnect() {
        this.cancelReconnect();
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }
    /**
     * Cancel scheduled reconnection
     */
    cancelReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    /**
     * Send data to the daemon via POST request
     */
    async send(path, data) {
        const url = `${this.options.daemonUrl}${path}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            this.options.onError?.(error);
            throw error;
        }
    }
    /**
     * Destroy the connection
     */
    destroy() {
        this.disconnect();
        this.cancelReconnect();
    }
}
/**
 * Session stream manager
 */
export class SessionStreamManager {
    options;
    connection = null;
    sessionId = null;
    constructor(options) {
        this.options = options;
    }
    /**
     * Start streaming session updates
     */
    start(sessionId) {
        this.stop();
        this.sessionId = sessionId;
        this.connection = new SSEConnection({
            ...this.options,
            daemonUrl: `${this.options.daemonUrl}/sessions/${sessionId}/stream`,
        });
        this.connection.connect();
    }
    /**
     * Stop streaming
     */
    stop() {
        if (this.connection) {
            this.connection.destroy();
            this.connection = null;
        }
        this.sessionId = null;
    }
    /**
     * Check if streaming
     */
    isStreaming() {
        return this.connection?.isConnected() ?? false;
    }
    /**
     * Get current session ID
     */
    getSessionId() {
        return this.sessionId;
    }
    /**
     * Send message to session
     */
    async sendMessage(message) {
        if (!this.sessionId) {
            throw new Error('No active session');
        }
        if (!this.connection) {
            throw new Error('No active connection');
        }
        return this.connection.send(`/sessions/${this.sessionId}/messages`, message);
    }
    /**
     * Update task status
     */
    async updateStatus(status) {
        if (!this.sessionId) {
            throw new Error('No active session');
        }
        if (!this.connection) {
            throw new Error('No active connection');
        }
        return this.connection.send(`/sessions/${this.sessionId}/status`, { status });
    }
    /**
     * Destroy the manager
     */
    destroy() {
        this.stop();
    }
}
/**
 * HTTP client for daemon API
 */
export class DaemonClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    /**
     * GET request
     */
    async get(path) {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }
    /**
     * POST request
     */
    async post(path, data) {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }
    /**
     * PUT request
     */
    async put(path, data) {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }
    /**
     * DELETE request
     */
    async delete(path) {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }
    /**
     * Check daemon health
     */
    async healthCheck() {
        try {
            const result = await this.get('/health');
            return result.ok === true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get current selection
     */
    async getSelection() {
        return this.get('/selection');
    }
    /**
     * Get all sessions
     */
    async getSessions() {
        return this.get('/sessions');
    }
    /**
     * Create a new session
     */
    async createSession(data) {
        return this.post('/sessions', data);
    }
    /**
     * Update a session
     */
    async updateSession(sessionId, data) {
        return this.put(`/sessions/${sessionId}`, data);
    }
    /**
     * Delete a session
     */
    async deleteSession(sessionId) {
        return this.delete(`/sessions/${sessionId}`);
    }
    /**
     * Get source code context
     */
    async getSource(params) {
        const searchParams = new URLSearchParams();
        searchParams.set('file', params.file);
        if (params.line)
            searchParams.set('line', String(params.line));
        if (params.context)
            searchParams.set('context', String(params.context));
        return this.get(`/source?${searchParams.toString()}`);
    }
}
//# sourceMappingURL=communication.js.map