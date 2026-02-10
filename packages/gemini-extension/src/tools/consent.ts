import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { writeConfig } from "@epiphytic/ai-plugin-translator";

export function registerConsentTool(server: McpServer): void {
  server.tool(
    "pluginx_consent",
    "Set the user's consent level for pluginx security. Call this after presenting the security notice to the user.",
    {
      level: z
        .enum(["acknowledged", "bypass", "declined"])
        .describe(
          "Consent level: 'acknowledged' (accept risks), 'bypass' (skip future prompts), or 'declined' (refuse)"
        ),
    },
    async ({ level }) => {
      try {
        await writeConfig({ consentLevel: level });

        const messages: Record<string, string> = {
          acknowledged:
            "Consent acknowledged. You can now use pluginx commands.",
          bypass:
            "Consent saved. Future consent prompts will be skipped.",
          declined:
            "Consent declined. Plugin installation commands will not proceed until consent is given.",
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "success",
                consentLevel: level,
                message: messages[level],
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
