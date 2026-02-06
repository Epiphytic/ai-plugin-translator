import { describe, it, expect } from "vitest";
import { generateGeminiHooks } from "../../../../src/adapters/gemini/generators/hooks.js";
import type { HookIR } from "../../../../src/ir/types.js";

describe("generateGeminiHooks", () => {
  it("maps PreToolUse to BeforeTool", () => {
    const hooks: HookIR[] = [
      {
        event: "PreToolUse",
        command: "echo check",
        timeout: 5000,
        sourceEvent: "PreToolUse",
      },
    ];
    const result = generateGeminiHooks(hooks);
    expect(result.hooksJson.hooks.BeforeTool).toBeDefined();
  });

  it("maps PostToolUse to AfterTool", () => {
    const hooks: HookIR[] = [
      {
        event: "PostToolUse",
        matcher: "Bash",
        command: "echo done",
        timeout: 10000,
        sourceEvent: "PostToolUse",
      },
    ];
    const result = generateGeminiHooks(hooks);
    expect(result.hooksJson.hooks.AfterTool).toBeDefined();
    expect(result.hooksJson.hooks.AfterTool[0].matcher).toBe("Bash");
  });

  it("replaces CLAUDE_PLUGIN_ROOT with extensionPath in commands", () => {
    const hooks: HookIR[] = [
      {
        event: "PreToolUse",
        command: "python3 ${CLAUDE_PLUGIN_ROOT}/hooks/check.py",
        timeout: 5000,
        sourceEvent: "PreToolUse",
      },
    ];
    const result = generateGeminiHooks(hooks);
    const hookCmd =
      result.hooksJson.hooks.BeforeTool[0].hooks[0].command;
    expect(hookCmd).toBe("python3 ${extensionPath}/hooks/check.py");
  });

  it("preserves timeout in milliseconds", () => {
    const hooks: HookIR[] = [
      {
        event: "SessionStart",
        command: "echo start",
        timeout: 15000,
        sourceEvent: "SessionStart",
      },
    ];
    const result = generateGeminiHooks(hooks);
    expect(
      result.hooksJson.hooks.SessionStart[0].hooks[0].timeout
    ).toBe(15000);
  });

  it("adds warnings for approximate mappings", () => {
    const hooks: HookIR[] = [
      {
        event: "UserPromptSubmit",
        command: "echo submit",
        timeout: 5000,
        sourceEvent: "UserPromptSubmit",
      },
    ];
    const result = generateGeminiHooks(hooks);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("approximate");
  });

  it("returns empty hooks object for empty input", () => {
    const result = generateGeminiHooks([]);
    expect(Object.keys(result.hooksJson.hooks)).toHaveLength(0);
  });
});
