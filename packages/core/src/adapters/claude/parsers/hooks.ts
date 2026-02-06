import { readFile } from "fs/promises";
import { join } from "path";
import type { HookIR, UnsupportedComponent } from "../../../ir/types.js";

const UNSUPPORTED_EVENTS = new Set(["SubagentStop"]);
const DEFAULT_TIMEOUT_SEC = 30;

interface ClaudeHookEntry {
  type: string;
  command: string;
  timeout?: number;
}

interface ClaudeHookMatcher {
  matcher?: string;
  hooks: ClaudeHookEntry[];
}

export interface HooksParseResult {
  hooks: HookIR[];
  unsupported: UnsupportedComponent[];
}

export async function parseClaudeHooksFile(
  pluginPath: string
): Promise<HooksParseResult> {
  const hooksPath = join(pluginPath, "hooks", "hooks.json");
  let raw: string;
  try {
    raw = await readFile(hooksPath, "utf-8");
  } catch {
    return { hooks: [], unsupported: [] };
  }

  const parsed = JSON.parse(raw);
  const hooksObj = parsed.hooks ?? parsed;
  return parseClaudeHooksFromObject(hooksObj);
}

export function parseClaudeHooksFromObject(
  hooksObj: Record<string, unknown>
): HooksParseResult {
  const hooks: HookIR[] = [];
  const unsupported: UnsupportedComponent[] = [];

  for (const [event, matchers] of Object.entries(hooksObj)) {
    if (UNSUPPORTED_EVENTS.has(event)) {
      unsupported.push({
        type: "hook",
        name: event,
        reason: `No target ecosystem equivalent for "${event}" hook event`,
        sourceEcosystem: "claude",
      });
      continue;
    }

    for (const matcherGroup of matchers as ClaudeHookMatcher[]) {
      for (const hookEntry of matcherGroup.hooks) {
        hooks.push({
          event,
          matcher: matcherGroup.matcher || undefined,
          command: hookEntry.command,
          timeout: (hookEntry.timeout ?? DEFAULT_TIMEOUT_SEC) * 1000,
          sourceEvent: event,
        });
      }
    }
  }

  return { hooks, unsupported };
}
