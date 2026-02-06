import { describe, it, expect } from "vitest";
import {
  parseClaudeHooksFile,
  parseClaudeHooksFromObject,
} from "../../../../src/adapters/claude/parsers/hooks.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../../../fixtures/claude-plugins");

describe("parseClaudeHooksFile", () => {
  it("parses hooks from hooks.json", async () => {
    const result = await parseClaudeHooksFile(join(fixtures, "full"));
    expect(result.hooks.length).toBe(2); // SubagentStop is unsupported
  });

  it("converts timeout from seconds to milliseconds", async () => {
    const result = await parseClaudeHooksFile(join(fixtures, "full"));
    const preToolUse = result.hooks.find((h) => h.event === "PreToolUse");
    expect(preToolUse!.timeout).toBe(10000);
  });

  it("preserves matcher patterns", async () => {
    const result = await parseClaudeHooksFile(join(fixtures, "full"));
    const preToolUse = result.hooks.find((h) => h.event === "PreToolUse");
    expect(preToolUse!.matcher).toBe("Write|Edit");
  });

  it("marks SubagentStop as unsupported", async () => {
    const result = await parseClaudeHooksFile(join(fixtures, "full"));
    expect(result.unsupported).toHaveLength(1);
    expect(result.unsupported[0].type).toBe("hook");
    expect(result.unsupported[0].name).toBe("SubagentStop");
  });

  it("defaults timeout to 30000ms when not specified", async () => {
    const result = await parseClaudeHooksFile(join(fixtures, "full"));
    const postToolUse = result.hooks.find((h) => h.event === "PostToolUse");
    expect(postToolUse!.timeout).toBe(30000);
  });

  it("returns empty when no hooks directory exists", async () => {
    const result = await parseClaudeHooksFile(join(fixtures, "basic"));
    expect(result.hooks).toEqual([]);
    expect(result.unsupported).toEqual([]);
  });
});

describe("parseClaudeHooksFromObject", () => {
  it("parses hooks embedded in plugin.json", () => {
    const embedded = {
      SessionStart: [
        {
          matcher: "",
          hooks: [{ type: "command", command: "echo start" }],
        },
      ],
    };
    const result = parseClaudeHooksFromObject(embedded);
    expect(result.hooks).toHaveLength(1);
    expect(result.hooks[0].event).toBe("SessionStart");
    expect(result.hooks[0].command).toBe("echo start");
  });
});
