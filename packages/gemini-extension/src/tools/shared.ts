import { checkConsent, SECURITY_NOTICE } from "@epiphytic/ai-plugin-translator";

export async function requireConsent(configPath?: string): Promise<
  | { ok: true; consentLevel: "bypass" | "acknowledged" }
  | { ok: false; response: { content: Array<{ type: "text"; text: string }> } }
> {
  const result = await checkConsent(configPath);
  if (result === "required") {
    return {
      ok: false,
      response: {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "consent_required",
              securityNotice: SECURITY_NOTICE,
              instructions:
                "Present the security notice to the user using ask_user with choices: 'acknowledged' (recommended), 'bypass' (skip future prompts), or 'declined'. Then call pluginx_consent with their answer before retrying this command.",
            }),
          },
        ],
      },
    };
  }
  return { ok: true, consentLevel: result };
}
