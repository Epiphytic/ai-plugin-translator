import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { runAddMarketplace } from "@epiphytic/ai-plugin-translator";
import { requireConsent, type LogFn } from "./shared.js";

export function registerAddMarketplaceTool(
  mcpServer: McpServer,
  server: Server,
  log: LogFn
): void {
  mcpServer.tool(
    "pluginx_add_marketplace",
    "Add all plugins from a Claude Code marketplace repository as Gemini CLI extensions.",
    {
      source: z
        .string()
        .describe("GitHub URL, owner/repo shorthand, or local path to marketplace"),
      consent: z
        .boolean()
        .optional()
        .describe("Pass --consent to gemini extensions link"),
    },
    async ({ source, consent }) => {
      const check = await requireConsent(server);
      if (!check.ok) return check.response;

      try {
        const { reports, plugins, failures } = await runAddMarketplace({
          source,
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
                pluginsAdded: plugins.length,
                plugins: plugins.map((p) => ({
                  name: p.name,
                  sourceType: p.sourceType,
                  type: p.type,
                })),
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
