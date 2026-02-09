import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { runUpdateAll } from "@epiphytic/ai-plugin-translator";
import { requireConsent, type LogFn } from "./shared.js";

export function registerUpdateAllTool(
  mcpServer: McpServer,
  server: Server,
  log: LogFn
): void {
  mcpServer.tool(
    "pluginx_update_all",
    "Update all tracked plugins: pull latest sources, re-translate, and re-link.",
    {
      consent: z
        .boolean()
        .optional()
        .describe("Pass --consent to gemini extensions link"),
    },
    async ({ consent }) => {
      log("Starting update-all...");
      log("Checking consent...");

      const check = await requireConsent(server);
      if (!check.ok) return check.response;

      log("Loading tracked plugins...");

      try {
        const { reports, failures } = await runUpdateAll({
          consent,
          consentLevel: check.consentLevel,
          onProgress: log,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: failures.length > 0 ? "partial" : "success",
                updated: reports.length,
                reports: reports.map((r) => ({
                  pluginName: r.pluginName,
                  translated: r.translated.length,
                  skipped: r.skipped.length,
                  warnings: r.warnings,
                })),
                failures,
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
