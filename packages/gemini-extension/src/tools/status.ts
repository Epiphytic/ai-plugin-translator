import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runStatus } from "@epiphytic/ai-plugin-translator";

export function registerStatusTool(server: McpServer): void {
  server.tool(
    "pluginx_status",
    "Check if tracked plugins are up to date with their sources.",
    {},
    async () => {
      try {
        const statuses = await runStatus({});

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "success",
                count: statuses.length,
                plugins: statuses.map((s) => ({
                  name: s.name,
                  sourceUrl: s.sourceUrl,
                  lastTranslated: s.lastTranslated,
                  upToDate: s.upToDate,
                })),
              }),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "error",
                error: (err as Error).message,
              }),
            },
          ],
        };
      }
    }
  );
}
