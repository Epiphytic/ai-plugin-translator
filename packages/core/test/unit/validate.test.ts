import { describe, it, expect } from "vitest";
import { checkTranslationParity } from "../../src/validate.js";
import type { PluginIR } from "../../src/ir/types.js";
import type { TranslationReport } from "../../src/adapters/types.js";

function makeIR(overrides: Partial<PluginIR> = {}): PluginIR {
  return {
    manifest: { name: "test-plugin", version: "1.0.0", description: "test" },
    commands: [],
    skills: [],
    hooks: [],
    mcpServers: [],
    contextFiles: [],
    agents: [],
    unsupported: [],
    ...overrides,
  };
}

function makeReport(overrides: Partial<TranslationReport> = {}): TranslationReport {
  return {
    source: "claude",
    target: "gemini",
    pluginName: "test-plugin",
    translated: [{ type: "manifest", name: "test-plugin" }],
    skipped: [],
    warnings: [],
    ...overrides,
  };
}

describe("checkTranslationParity", () => {
  it("passes for a minimal plugin with only manifest", () => {
    const ir = makeIR();
    const report = makeReport();

    const result = checkTranslationParity(ir, report);
    expect(result.passed).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("passes when all IR components are translated", () => {
    const ir = makeIR({
      commands: [
        {
          name: "commit",
          description: "Commit",
          prompt: "do it",
          shellInjections: [],
        },
      ],
      skills: [
        {
          name: "review",
          description: "Review",
          content: "body",
          frontmatter: {},
        },
      ],
      agents: [
        {
          name: "helper",
          description: "Helper",
          content: "body",
          frontmatter: {},
        },
      ],
      hooks: [
        { event: "PreToolUse", command: "echo", timeout: 5000, sourceEvent: "PreToolUse" },
      ],
      mcpServers: [{ name: "my-mcp", type: "stdio", command: "node" }],
      contextFiles: [{ filename: "CONTEXT.md", content: "ctx" }],
    });

    const report = makeReport({
      translated: [
        { type: "manifest", name: "test-plugin" },
        { type: "command", name: "commit" },
        { type: "skill", name: "review" },
        { type: "agent", name: "helper" },
        { type: "hook", name: "PreToolUse" },
        { type: "mcp-server", name: "my-mcp" },
        { type: "context", name: "GEMINI.md" },
      ],
    });

    const result = checkTranslationParity(ir, report);
    expect(result.passed).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("detects missing translated command", () => {
    const ir = makeIR({
      commands: [
        {
          name: "commit",
          description: "Commit",
          prompt: "do it",
          shellInjections: [],
        },
      ],
    });

    const report = makeReport();

    const result = checkTranslationParity(ir, report);
    expect(result.passed).toBe(false);
    expect(result.errors).toContain('missing translated command: "commit"');
  });

  it("detects missing translated agent", () => {
    const ir = makeIR({
      agents: [
        {
          name: "helper",
          description: "Helper",
          content: "body",
          frontmatter: {},
        },
      ],
    });

    const report = makeReport();

    const result = checkTranslationParity(ir, report);
    expect(result.passed).toBe(false);
    expect(result.errors).toContain('missing translated agent: "helper"');
  });

  it("detects missing translated skill", () => {
    const ir = makeIR({
      skills: [
        {
          name: "review",
          description: "Review",
          content: "body",
          frontmatter: {},
        },
      ],
    });

    const report = makeReport();

    const result = checkTranslationParity(ir, report);
    expect(result.passed).toBe(false);
    expect(result.errors).toContain('missing translated skill: "review"');
  });

  it("detects missing translated mcp-server", () => {
    const ir = makeIR({
      mcpServers: [{ name: "my-mcp", type: "stdio", command: "node" }],
    });

    const report = makeReport();

    const result = checkTranslationParity(ir, report);
    expect(result.passed).toBe(false);
    expect(result.errors).toContain('missing translated mcp-server: "my-mcp"');
  });

  it("detects hook count mismatch", () => {
    const ir = makeIR({
      hooks: [
        { event: "PreToolUse", command: "echo", timeout: 5000, sourceEvent: "PreToolUse" },
        { event: "PostToolUse", command: "echo", timeout: 5000, sourceEvent: "PostToolUse" },
      ],
    });

    const report = makeReport({
      translated: [
        { type: "manifest", name: "test-plugin" },
        { type: "hook", name: "PreToolUse" },
      ],
    });

    const result = checkTranslationParity(ir, report);
    expect(result.passed).toBe(false);
    expect(result.errors).toContain("hooks: expected 2 translated, got 1");
  });

  it("detects missing context when IR has context files", () => {
    const ir = makeIR({
      contextFiles: [{ filename: "CONTEXT.md", content: "ctx" }],
    });

    const report = makeReport();

    const result = checkTranslationParity(ir, report);
    expect(result.passed).toBe(false);
    expect(result.errors).toContain("context: expected 1 translated, got 0");
  });

  it("detects missing skipped component for unsupported IR item", () => {
    const ir = makeIR({
      unsupported: [
        {
          type: "hook",
          name: "SubagentStop",
          reason: "No equivalent",
          sourceEcosystem: "claude",
        },
      ],
    });

    const report = makeReport();

    const result = checkTranslationParity(ir, report);
    expect(result.passed).toBe(false);
    expect(result.errors).toContain(
      'missing skipped component: hook:"SubagentStop"'
    );
  });

  it("passes when unsupported components are properly skipped", () => {
    const ir = makeIR({
      unsupported: [
        {
          type: "hook",
          name: "SubagentStop",
          reason: "No equivalent",
          sourceEcosystem: "claude",
        },
      ],
    });

    const report = makeReport({
      skipped: [
        { type: "hook", name: "SubagentStop", reason: "No equivalent" },
      ],
    });

    const result = checkTranslationParity(ir, report);
    expect(result.passed).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("detects missing manifest in translated list", () => {
    const ir = makeIR();
    const report = makeReport({ translated: [] });

    const result = checkTranslationParity(ir, report);
    expect(result.passed).toBe(false);
    expect(result.errors).toContain("missing translated manifest");
  });

  it("detects total count mismatch", () => {
    const ir = makeIR({
      commands: [
        {
          name: "commit",
          description: "Commit",
          prompt: "do it",
          shellInjections: [],
        },
      ],
    });

    // Report has manifest + command + an extra phantom entry
    const report = makeReport({
      translated: [
        { type: "manifest", name: "test-plugin" },
        { type: "command", name: "commit" },
        { type: "skill", name: "phantom" },
      ],
    });

    const result = checkTranslationParity(ir, report);
    expect(result.passed).toBe(false);
    expect(result.errors).toContain("total translated: expected 2, got 3");
  });
});
