import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { runAdd } from "@epiphytic/ai-plugin-translator";
import { requireConsent, type LogFn } from "./shared.js";

export function registerAddTool(
  mcpServer: McpServer,
  server: Server,
  log: LogFn
): void {
  mcpServer.tool(
    "pluginx_add",
    "Add a Claude Code plugin as a Gemini CLI extension. Translates the plugin and links it.",
    {
      source: z
        .string()
        .describe("GitHub URL, owner/repo shorthand, or local path"),
      consent: z
        .boolean()
        .optional()
        .describe("Pass --consent to gemini extensions link"),
    },
    async ({ source, consent }) => {
      const check = await requireConsent(server);
      if (!check.ok) return check.response;

      try {
        const { report, plugin } = await runAdd({
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
                status: "success",
                plugin: {
                  name: plugin.name,
                  sourceType: plugin.sourceType,
                  sourceUrl: plugin.sourceUrl,
                  type: plugin.type,
                },
                report: {
                  pluginName: report.pluginName,
                  translated: report.translated.length,
                  skipped: report.skipped.length,
                  warnings: report.warnings,
                },
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
