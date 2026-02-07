import { openSync, createReadStream, createWriteStream } from "fs";
import select from "@inquirer/select";
import { checkConsent, writeConfig, type ConsentResult } from "./config.js";

const SECURITY_BANNER = `
PLUGINX SECURITY NOTICE

pluginx is an EXPERIMENTAL tool that translates Claude Code plugins
into Gemini CLI extensions.

By using pluginx, you are installing code from third-party plugin
developers into your Gemini CLI environment. These plugins may contain
arbitrary shell commands in hooks, MCP servers, and command prompts.

ONLY install plugins from developers that you trust.
`;

export type ConsentLevel = "bypass" | "acknowledged" | "declined";

interface ConsentOptions {
  configPath?: string;
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
  nonInteractive?: boolean;
}

function openTtyStreams(): {
  input: NodeJS.ReadableStream;
  output: NodeJS.WritableStream;
} {
  const fd = openSync("/dev/tty", "r+");
  const input = createReadStream("", { fd });
  const output = createWriteStream("", { fd });
  return { input, output };
}

function getInteractiveStreams(options?: ConsentOptions): {
  input: NodeJS.ReadableStream;
  output: NodeJS.WritableStream;
} {
  if (options?.input && options?.output) {
    return { input: options.input, output: options.output };
  }

  // If stdin is a TTY, use stdin/stderr directly
  if (process.stdin.isTTY) {
    return { input: process.stdin, output: process.stderr };
  }

  // Otherwise open /dev/tty for direct terminal access
  try {
    return openTtyStreams();
  } catch {
    throw new Error(
      "No interactive terminal available. Run 'pluginx consent' manually to set consent."
    );
  }
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

  const { input, output } = getInteractiveStreams(options);

  // Write the security banner
  output.write(SECURITY_BANNER + "\n");

  const answer = await select(
    {
      message: "Do you consent to using pluginx?",
      choices: [
        {
          name: "Yes, I understand the risks (recommended)",
          value: "acknowledged" as const,
        },
        {
          name: "Yes, and bypass consent screens in the future",
          value: "bypass" as const,
        },
        {
          name: "No, I don't consent",
          value: "declined" as const,
        },
      ],
    },
    { input, output }
  );

  await writeConfig({ consentLevel: answer }, options?.configPath);
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
    console.log(
      "Consent declined. Run 'pluginx consent' to change this setting."
    );
    process.exit(0);
  }

  return level;
}
