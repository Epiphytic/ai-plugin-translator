import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runUpdateAll } from "@epiphytic/ai-plugin-translator";
import { requireConsent, type LogFn } from "./shared.js";

export function registerUpdateAllTool(server: McpServer, log: LogFn): void {
  server.tool(
    "pluginx_update_all",
    "Update all tracked plugins: pull latest sources, re-translate, and re-link.",
    {
      consent: z
        .boolean()
        .optional()
        .describe("Pass --consent to gemini extensions link"),
    },
    async ({ consent }) => {
      const check = await requireConsent();
      if (!check.ok) return check.response;

      try {
        const reports = await runUpdateAll({
          consent,
          consentLevel: check.consentLevel,
          onProgress: log,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "success",
                updated: reports.length,
                reports: reports.map((r) => ({
                  pluginName: r.pluginName,
                  translated: r.translated.length,
                  skipped: r.skipped.length,
                  warnings: r.warnings,
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
