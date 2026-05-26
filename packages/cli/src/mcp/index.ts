// Main MCP server entry point

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TOOL_HANDLERS } from './handlers.js';
import { TOOL_DEFS } from './tool-defs.js';
import { MCP_INSTRUCTIONS } from './instructions.js';
import { getVersion } from '../version.js';

const SERVER_NAME = 'ui-inspect';
const SERVER_VERSION = getVersion();

export interface RunMcpOptions {
  daemonUrl: string;
}

export async function runMcpStdio({ daemonUrl }: RunMcpOptions): Promise<void> {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: { tools: {} },
      instructions: MCP_INSTRUCTIONS,
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFS,
  }));

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const handler = TOOL_HANDLERS[name as keyof typeof TOOL_HANDLERS];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const result = await handler(args, daemonUrl);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: errorMessage }, null, 2) }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Re-export commonly used types and functions
export * from './types.js';
export * from './tool-defs.js';
export * from './project-root.js';
export * from './wait.js';
export * from './compact.js';
