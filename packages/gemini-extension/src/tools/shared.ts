import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  checkConsent,
  writeConfig,
  SECURITY_NOTICE,
} from "@epiphytic/ai-plugin-translator";

export type LogFn = (message: string) => void;

export async function requireConsent(
  server: Server,
  configPath?: string
): Promise<
  | { ok: true; consentLevel: "bypass" | "acknowledged" }
  | { ok: false; response: { content: Array<{ type: "text"; text: string }> } }
> {
  const result = await checkConsent(configPath);
  if (result !== "required") {
    return { ok: true, consentLevel: result };
  }

  // Use MCP elicitation to ask the user directly
  try {
    const elicitResult = await server.elicitInput({
      mode: "form",
      message: SECURITY_NOTICE,
      requestedSchema: {
        type: "object" as const,
        properties: {
          consent: {
            type: "string",
            title: "Security Consent",
            description: "How would you like to proceed?",
            oneOf: [
              {
                const: "acknowledged",
                title: "Acknowledged - Accept risks for this session",
              },
              {
                const: "bypass",
                title: "Bypass - Skip future consent prompts",
              },
              {
                const: "declined",
                title: "Declined - Refuse to proceed",
              },
            ],
          },
        },
        required: ["consent"],
      },
    });

    if (
      elicitResult.action === "accept" &&
      elicitResult.content?.consent
    ) {
      const level = elicitResult.content.consent as string;
      if (level === "acknowledged" || level === "bypass") {
        await writeConfig({ consentLevel: level });
        return { ok: true, consentLevel: level };
      }
    }

    // User declined or cancelled
    return {
      ok: false,
      response: {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "declined",
              message:
                "Consent declined. Plugin commands will not proceed until consent is given.",
            }),
          },
        ],
      },
    };
  } catch {
    // Elicitation not supported by client — fall back to model-mediated flow.
    // Return structured ask_user instructions matching the conductor pattern
    // so the model calls the native ask_user tool.
    return {
      ok: false,
      response: {
        content: [
          {
            type: "text",
            text: [
              "ACTION REQUIRED: You MUST present the security notice and obtain consent before proceeding.",
              "",
              `Security notice: ${SECURITY_NOTICE}`,
              "",
              "Present this notice to the user, then ask for their consent using the `ask_user` tool:",
              '- **header:** "Consent"',
              '- **question:** "' + SECURITY_NOTICE.replace(/\n/g, " ") + '\\n\\nHow would you like to proceed?"',
              '- **type:** "choice"',
              "- **multiSelect:** `false`",
              "- **options:**",
              '    - Label: "Acknowledged", Description: "Accept the risks for this session only"',
              '    - Label: "Bypass", Description: "Accept and skip future consent prompts"',
              '    - Label: "Declined", Description: "Refuse to proceed"',
              "",
              "After the user responds:",
              '- If "Acknowledged": call `pluginx_consent` with level "acknowledged", then retry the original command.',
              '- If "Bypass": call `pluginx_consent` with level "bypass", then retry the original command.',
              '- If "Declined": inform the user that the operation was cancelled. Do NOT retry.',
            ].join("\n"),
          },
        ],
      },
    };
  }
}
