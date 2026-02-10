import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runRemove } from "@epiphytic/ai-plugin-translator";

export function registerRemoveTool(server: McpServer): void {
  server.tool(
    "pluginx_remove",
    "Remove a plugin from pluginx tracking. Note: you must also run `gemini extensions uninstall <name>` to fully remove it.",
    {
      name: z.string().describe("Plugin name to remove"),
    },
    async ({ name }) => {
      try {
        const removed = await runRemove({ name });

        if (!removed) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: "error",
                  error: `Plugin not found: ${name}`,
                }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "success",
                removed: name,
                hint: `To fully uninstall, run: gemini extensions uninstall ${name}`,
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
