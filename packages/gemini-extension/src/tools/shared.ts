import { checkConsent, SECURITY_NOTICE } from "@epiphytic/ai-plugin-translator";

export type LogFn = (message: string) => void;

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
            }),
          },
        ],
      },
    };
  }
  return { ok: true, consentLevel: result };
}
