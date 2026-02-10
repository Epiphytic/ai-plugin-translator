import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runList } from "@epiphytic/ai-plugin-translator";

export function registerListTool(server: McpServer): void {
  server.tool(
    "pluginx_list",
    "List all tracked plugins managed by pluginx.",
    {},
    async () => {
      try {
        const plugins = await runList({});

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "success",
                count: plugins.length,
                plugins: plugins.map((p) => ({
                  name: p.name,
                  sourceType: p.sourceType,
                  sourceUrl: p.sourceUrl,
                  sourcePath: p.sourcePath,
                  type: p.type,
                  lastTranslated: p.lastTranslated,
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
