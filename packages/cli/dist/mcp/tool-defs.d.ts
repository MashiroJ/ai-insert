export declare const TOOL_DEFS: ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            project: {
                type: string;
                description: string;
            };
            timeoutMs?: undefined;
            context?: undefined;
            sinceTimestamp?: undefined;
            afterRequestId?: undefined;
            responseMode?: undefined;
            sessionId?: undefined;
            status?: undefined;
            content?: undefined;
        };
        additionalProperties: boolean;
        required?: undefined;
    };
    annotations: {
        title: string;
        readOnlyHint: boolean;
        idempotentHint: boolean;
        openWorldHint: boolean;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            project?: undefined;
            timeoutMs?: undefined;
            context?: undefined;
            sinceTimestamp?: undefined;
            afterRequestId?: undefined;
            responseMode?: undefined;
            sessionId?: undefined;
            status?: undefined;
            content?: undefined;
        };
        additionalProperties: boolean;
        required?: undefined;
    };
    annotations: {
        title: string;
        readOnlyHint: boolean;
        idempotentHint: boolean;
        openWorldHint: boolean;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            timeoutMs: {
                type: string;
                description: string;
            };
            context: {
                type: string;
                description: string;
            };
            sinceTimestamp: {
                type: string;
                description: string;
            };
            afterRequestId: {
                type: string;
                description: string;
            };
            responseMode: {
                type: string;
                enum: string[];
                description: string;
            };
            project?: undefined;
            sessionId?: undefined;
            status?: undefined;
            content?: undefined;
        };
        additionalProperties: boolean;
        required?: undefined;
    };
    annotations: {
        title: string;
        readOnlyHint: boolean;
        idempotentHint: boolean;
        openWorldHint: boolean;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            context: {
                type: string;
                description: string;
            };
            project?: undefined;
            timeoutMs?: undefined;
            sinceTimestamp?: undefined;
            afterRequestId?: undefined;
            responseMode?: undefined;
            sessionId?: undefined;
            status?: undefined;
            content?: undefined;
        };
        additionalProperties: boolean;
        required?: undefined;
    };
    annotations: {
        title: string;
        readOnlyHint: boolean;
        idempotentHint: boolean;
        openWorldHint: boolean;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            sessionId: {
                type: string;
                description: string;
            };
            status: {
                type: string;
                enum: string[];
                description: string;
            };
            project?: undefined;
            timeoutMs?: undefined;
            context?: undefined;
            sinceTimestamp?: undefined;
            afterRequestId?: undefined;
            responseMode?: undefined;
            content?: undefined;
        };
        required: string[];
        additionalProperties: boolean;
    };
    annotations: {
        title: string;
        readOnlyHint: boolean;
        idempotentHint: boolean;
        openWorldHint: boolean;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            content: {
                type: string;
                description: string;
            };
            project?: undefined;
            timeoutMs?: undefined;
            context?: undefined;
            sinceTimestamp?: undefined;
            afterRequestId?: undefined;
            responseMode?: undefined;
            sessionId?: undefined;
            status?: undefined;
        };
        required: string[];
        additionalProperties: boolean;
    };
    annotations: {
        title: string;
        readOnlyHint: boolean;
        idempotentHint: boolean;
        openWorldHint: boolean;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            sessionId: {
                type: string;
                description: string;
            };
            content: {
                type: string;
                description: string;
            };
            afterRequestId: {
                type: string;
                description: string;
            };
            status: {
                type: string;
                enum: string[];
                description: string;
            };
            timeoutMs: {
                type: string;
                description: string;
            };
            context: {
                type: string;
                description: string;
            };
            sinceTimestamp: {
                type: string;
                description: string;
            };
            responseMode: {
                type: string;
                enum: string[];
                description: string;
            };
            project?: undefined;
        };
        required: string[];
        additionalProperties: boolean;
    };
    annotations: {
        title: string;
        readOnlyHint: boolean;
        idempotentHint: boolean;
        openWorldHint: boolean;
    };
})[];
export declare function getMcpToolDefinition(name: string): unknown;
