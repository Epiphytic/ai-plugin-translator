import { describe, it, expect } from "vitest";
import { ClaudeSourceAdapter } from "../../../../src/adapters/claude/source.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../../../fixtures/claude-plugins");

describe("ClaudeSourceAdapter", () => {
  const adapter = new ClaudeSourceAdapter();

  it("has name 'claude'", () => {
    expect(adapter.name).toBe("claude");
  });

  it("detects a Claude plugin directory", async () => {
    expect(await adapter.detect(join(fixtures, "full"))).toBe(true);
  });

  it("returns false for non-Claude directories", async () => {
    expect(await adapter.detect(join(fixtures, "nonexistent"))).toBe(false);
  });

  it("parses a full plugin into PluginIR", async () => {
    const ir = await adapter.parse(join(fixtures, "full"));

    expect(ir.manifest.name).toBe("full-plugin");
    expect(ir.commands.length).toBeGreaterThan(0);
    expect(ir.skills.length).toBeGreaterThan(0);
    expect(ir.hooks.length).toBeGreaterThan(0);
    expect(ir.mcpServers.length).toBeGreaterThan(0);
    expect(ir.agents.length).toBeGreaterThan(0);
    expect(ir.contextFiles.length).toBeGreaterThan(0);
  });

  it("merges hooks from both hooks.json and embedded plugin.json", async () => {
    const ir = await adapter.parse(join(fixtures, "full"));
    const events = ir.hooks.map((h) => h.event);
    expect(events).toContain("PreToolUse");
    expect(events).toContain("PostToolUse");
    expect(events).toContain("SessionStart");
  });

  it("merges MCP servers from both .mcp.json and embedded plugin.json", async () => {
    const ir = await adapter.parse(join(fixtures, "full"));
    const names = ir.mcpServers.map((s) => s.name);
    expect(names).toContain("my-mcp");
    expect(names).toContain("http-server");
    expect(names).toContain("my-server");
  });

  it("collects unsupported components", async () => {
    const ir = await adapter.parse(join(fixtures, "full"));
    expect(ir.unsupported.length).toBeGreaterThan(0);
    expect(ir.unsupported.find((u) => u.name === "SubagentStop")).toBeDefined();
  });

  it("parses a minimal plugin without errors", async () => {
    const ir = await adapter.parse(join(fixtures, "basic"));
    expect(ir.manifest.name).toBe("basic-plugin");
    expect(ir.commands).toEqual([]);
    expect(ir.skills).toEqual([]);
    expect(ir.hooks).toEqual([]);
    expect(ir.mcpServers).toEqual([]);
    expect(ir.agents).toEqual([]);
  });
});
