import type { ToolSpec } from "../sarvam";
import { getMcpSession, type McpToolInfo } from "./client";

export async function discoverCapabilities(): Promise<{
  tools: McpToolInfo[];
  source: "mcp" | "local";
}> {
  const session = await getMcpSession();
  return { tools: session.tools, source: session.source };
}

export function mcpToolsToSpecs(tools: McpToolInfo[]): ToolSpec[] {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description || `MCP tool: ${tool.name}`,
      parameters: tool.inputSchema,
    },
  }));
}

export async function getToolSpecs(): Promise<{ specs: ToolSpec[]; source: "mcp" | "local" }> {
  const session = await getMcpSession();
  return { specs: mcpToolsToSpecs(session.tools), source: session.source };
}

export async function executeMcpTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const session = await getMcpSession();
  return session.callTool(name, args);
}
