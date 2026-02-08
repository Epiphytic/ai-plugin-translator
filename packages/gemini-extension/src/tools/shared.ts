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
    // Elicitation not supported by client — return a simple signal.
    // GEMINI.md has prompt-level instructions telling the model to use
    // the native ask_user tool when it sees consent_required.
    return {
      ok: false,
      response: {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "consent_required",
              message:
                "Security consent is required before proceeding. Follow the consent instructions in GEMINI.md to obtain consent using the ask_user tool, then call pluginx_consent and retry.",
            }),
          },
        ],
      },
    };
  }
}
