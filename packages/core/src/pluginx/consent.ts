import { select, intro, outro, note, isCancel, cancel } from "@clack/prompts";
import { checkConsent, writeConfig, type ConsentResult } from "./config.js";

export const SECURITY_NOTICE = `pluginx is an EXPERIMENTAL tool that translates Claude Code plugins
into Gemini CLI extensions.

By using pluginx, you are installing code from third-party plugin
developers into your Gemini CLI environment. These plugins may contain
arbitrary shell commands in hooks, MCP servers, and command prompts.

ONLY install plugins from developers that you trust.`;

export type ConsentLevel = "bypass" | "acknowledged" | "declined";

interface ConsentOptions {
  configPath?: string;
  nonInteractive?: boolean;
}

export async function runConsentPrompt(
  options?: ConsentOptions
): Promise<ConsentLevel> {
  if (options?.nonInteractive) {
    process.stderr.write(
      "Non-interactive mode: auto-acknowledging pluginx consent.\n"
    );
    await writeConfig({ consentLevel: "acknowledged" }, options?.configPath);
    return "acknowledged";
  }

  intro("PLUGINX SECURITY NOTICE");

  note(SECURITY_NOTICE, "Warning");

  const answer = await select({
    message: "Do you consent to using pluginx?",
    options: [
      {
        label: "Yes, I understand the risks (recommended)",
        value: "acknowledged" as const,
      },
      {
        label: "Yes, and bypass consent screens in the future",
        value: "bypass" as const,
      },
      {
        label: "No, I don't consent",
        value: "declined" as const,
      },
    ],
  });

  if (isCancel(answer)) {
    cancel("Consent cancelled.");
    await writeConfig({ consentLevel: "declined" }, options?.configPath);
    return "declined";
  }

  await writeConfig({ consentLevel: answer }, options?.configPath);
  outro("Settings saved.");
  return answer;
}

export async function ensureConsent(
  options?: ConsentOptions
): Promise<ConsentResult> {
  const result = await checkConsent(options?.configPath);

  if (result !== "required") {
    return result;
  }

  const level = await runConsentPrompt({
    ...options,
    nonInteractive: options?.nonInteractive,
  });

  if (level === "declined") {
    process.exit(0);
  }

  return level;
}
