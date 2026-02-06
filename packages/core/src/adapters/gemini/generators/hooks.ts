import type { HookIR } from "../../../ir/types.js";

const EVENT_MAP: Record<string, string> = {
  PreToolUse: "BeforeTool",
  PostToolUse: "AfterTool",
  PreCompact: "PreCompress",
  UserPromptSubmit: "BeforeAgent",
  Stop: "AfterAgent",
  SessionStart: "SessionStart",
  SessionEnd: "SessionEnd",
  Notification: "Notification",
};

const APPROXIMATE_MAPPINGS = new Set(["UserPromptSubmit", "Stop"]);

interface GeminiHookEntry {
  type: string;
  command: string;
  timeout: number;
}

interface GeminiHookMatcher {
  matcher?: string;
  hooks: GeminiHookEntry[];
}

interface GeminiHooksJson {
  hooks: Record<string, GeminiHookMatcher[]>;
}

export interface HooksGeneratorResult {
  hooksJson: GeminiHooksJson;
  warnings: string[];
}

function replacePathVars(value: string): string {
  return value.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, "${extensionPath}");
}

export function generateGeminiHooks(hooks: HookIR[]): HooksGeneratorResult {
  const warnings: string[] = [];
  const grouped = new Map<string, HookIR[]>();

  for (const hook of hooks) {
    const geminiEvent = EVENT_MAP[hook.event];
    if (!geminiEvent) continue;

    if (APPROXIMATE_MAPPINGS.has(hook.event)) {
      warnings.push(
        `"${hook.event}" -> "${geminiEvent}" is an approximate mapping; behavior may differ`
      );
    }

    const existing = grouped.get(geminiEvent) ?? [];
    existing.push(hook);
    grouped.set(geminiEvent, existing);
  }

  const hooksJson: GeminiHooksJson = { hooks: {} };

  for (const [geminiEvent, eventHooks] of grouped) {
    hooksJson.hooks[geminiEvent] = eventHooks.map((h) => ({
      matcher: h.matcher,
      hooks: [
        {
          type: "command",
          command: replacePathVars(h.command),
          timeout: h.timeout,
        },
      ],
    }));
  }

  return { hooksJson, warnings };
}
