import { describe, it, expect } from "vitest";
import { parseClaudeManifest } from "../../../../src/adapters/claude/parsers/manifest.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../../../fixtures/claude-plugins");

describe("parseClaudeManifest", () => {
  it("parses a minimal manifest", async () => {
    const result = await parseClaudeManifest(join(fixtures, "basic"));
    expect(result.manifest.name).toBe("basic-plugin");
    expect(result.manifest.description).toBe("A basic test plugin");
    expect(result.manifest.version).toBe("0.0.0");
  });

  it("parses a full manifest with all fields", async () => {
    const result = await parseClaudeManifest(join(fixtures, "full"));
    expect(result.manifest.name).toBe("full-plugin");
    expect(result.manifest.version).toBe("2.1.0");
    expect(result.manifest.author).toEqual({
      name: "Test Author",
      email: "test@example.com",
      url: "https://example.com",
    });
    expect(result.manifest.repository).toBe(
      "https://github.com/test/full-plugin"
    );
    expect(result.manifest.homepage).toBe("https://full-plugin.dev");
    expect(result.manifest.keywords).toEqual(["test", "full-featured"]);
  });

  it("extracts embedded hooks from manifest", async () => {
    const result = await parseClaudeManifest(join(fixtures, "full"));
    expect(result.embeddedHooks).toBeDefined();
    expect(result.embeddedHooks!.SessionStart).toBeDefined();
  });

  it("extracts embedded mcpServers from manifest", async () => {
    const result = await parseClaudeManifest(join(fixtures, "full"));
    expect(result.embeddedMcpServers).toBeDefined();
    expect(result.embeddedMcpServers!["my-server"]).toBeDefined();
  });
});
