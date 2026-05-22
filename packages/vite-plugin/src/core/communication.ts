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
export class SSEConnection {
  private eventSource: EventSource | null = null;
  private state: ConnectionState = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private options: CommunicationOptions) {}

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }

  /**
   * Connect to the daemon
   */
  connect(): void {
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
        } catch (error) {
          this.options.onError?.(error as Error);
        }
      };

      this.eventSource.onerror = (error) => {
        this.state = 'error';
        this.options.onError?.(new Error('SSE connection error'));

        // Attempt reconnection
        this.scheduleReconnect();
      };

    } catch (error) {
      this.state = 'error';
      this.options.onError?.(error as Error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the daemon
   */
  disconnect(): void {
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
  private scheduleReconnect(): void {
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
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Send data to the daemon via POST request
   */
  async send(path: string, data: unknown): Promise<unknown> {
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
    } catch (error) {
      this.options.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Destroy the connection
   */
  destroy(): void {
    this.disconnect();
    this.cancelReconnect();
  }
}

/**
 * Session stream manager
 */
export class SessionStreamManager {
  private connection: SSEConnection | null = null;
  private sessionId: string | null = null;

  constructor(private options: CommunicationOptions) {}

  /**
   * Start streaming session updates
   */
  start(sessionId: string): void {
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
  stop(): void {
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }

    this.sessionId = null;
  }

  /**
   * Check if streaming
   */
  isStreaming(): boolean {
    return this.connection?.isConnected() ?? false;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Send message to session
   */
  async sendMessage(message: { content: string }): Promise<unknown> {
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
  async updateStatus(status: 'draft' | 'sent' | 'claimed' | 'working' | 'done' | 'failed'): Promise<unknown> {
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
  destroy(): void {
    this.stop();
  }
}

/**
 * HTTP client for daemon API
 */
export class DaemonClient {
  constructor(private baseUrl: string) {}

  /**
   * GET request
   */
  async get(path: string): Promise<unknown> {
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
  async post(path: string, data: unknown): Promise<unknown> {
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
  async put(path: string, data: unknown): Promise<unknown> {
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
  async delete(path: string): Promise<unknown> {
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
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.get('/health') as { ok: boolean };
      return result.ok === true;
    } catch {
      return false;
    }
  }

  /**
   * Get current selection
   */
  async getSelection(): Promise<unknown> {
    return this.get('/selection');
  }

  /**
   * Get all sessions
   */
  async getSessions(): Promise<unknown> {
    return this.get('/sessions');
  }

  /**
   * Create a new session
   */
  async createSession(data: unknown): Promise<unknown> {
    return this.post('/sessions', data);
  }

  /**
   * Update a session
   */
  async updateSession(sessionId: string, data: unknown): Promise<unknown> {
    return this.put(`/sessions/${sessionId}`, data);
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<unknown> {
    return this.delete(`/sessions/${sessionId}`);
  }

  /**
   * Get source code context
   */
  async getSource(params: { file: string; line?: number; context?: number }): Promise<unknown> {
    const searchParams = new URLSearchParams();
    searchParams.set('file', params.file);
    if (params.line) searchParams.set('line', String(params.line));
    if (params.context) searchParams.set('context', String(params.context));

    return this.get(`/source?${searchParams.toString()}`);
  }
}
