import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  server: string;
}

export interface McpSession {
  tools: McpToolInfo[];
  source: "mcp" | "local";
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

declare global {
  var __conduitMcpSession: Promise<McpSession> | undefined;
}

function mcpToolToInfo(tool: Tool, server: string): McpToolInfo {
  return {
    name: tool.name,
    description: tool.description || "",
    inputSchema: (tool.inputSchema as Record<string, unknown>) || { type: "object", properties: {} },
    server,
  };
}

async function connectSarvamMcp(): Promise<McpSession | null> {
  if (!process.env.SARVAM_API_KEY) return null;

  const transport = new StdioClientTransport({
    command: "uvx",
    args: ["sarvam-mcp"],
    env: {
      ...process.env,
      SARVAM_API_KEY: process.env.SARVAM_API_KEY,
    } as Record<string, string>,
  });

  const client = new Client({ name: "conduit", version: "0.1.0" }, { capabilities: {} });
  await client.connect(transport);

  const listed = await client.listTools();
  const tools = listed.tools.map((t) => mcpToolToInfo(t, "sarvam"));

  return {
    tools,
    source: "mcp",
    callTool: async (name, args) => {
      const result = await client.callTool({ name, arguments: args });
      const content = Array.isArray(result.content) ? result.content : [];
      const textPart = content.find((c: any) => c.type === "text");
      if (textPart && "text" in textPart) {
        try {
          return JSON.parse(textPart.text);
        } catch {
          return { result: textPart.text };
        }
      }
      return result;
    },
  };
}

export async function getMcpSession(): Promise<McpSession> {
  if (global.__conduitMcpSession) return global.__conduitMcpSession;

  global.__conduitMcpSession = (async () => {
    try {
      const session = await connectSarvamMcp();
      if (session && session.tools.length > 0) return session;
    } catch (err) {
      console.warn("[conduit] MCP connection failed, using local tools:", err);
    }

    const { TOOL_SPECS, executeTool } = await import("../tools");
    return {
      source: "local",
      tools: TOOL_SPECS.map((spec) => ({
        name: spec.function.name,
        description: spec.function.description,
        inputSchema: spec.function.parameters,
        server: "local",
      })),
      callTool: (name, args) => executeTool(name, args, { conversationId: "mcp-fallback" }),
    };
  })();

  return global.__conduitMcpSession;
}
