import { discoverCapabilities } from "@/lib/mcp/registry";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { tools, source } = await discoverCapabilities();
    return Response.json({
      source,
      count: tools.length,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        server: t.server,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to discover capabilities";
    return Response.json({ error: msg }, { status: 500 });
  }
}
