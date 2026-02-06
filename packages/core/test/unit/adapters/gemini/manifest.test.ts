import { describe, it, expect } from "vitest";
import { generateGeminiManifest } from "../../../../src/adapters/gemini/generators/manifest.js";
import type { ManifestIR, McpServerIR, ContextFileIR } from "../../../../src/ir/types.js";

describe("generateGeminiManifest", () => {
  it("generates basic manifest with required fields", () => {
    const manifest: ManifestIR = {
      name: "my-plugin",
      version: "1.0.0",
      description: "Test plugin",
    };
    const result = generateGeminiManifest(manifest, [], []);
    expect(result.name).toBe("my-plugin");
    expect(result.version).toBe("1.0.0");
    expect(result.description).toBe("Test plugin");
  });

  it("embeds MCP servers in manifest", () => {
    const manifest: ManifestIR = {
      name: "test",
      version: "1.0.0",
      description: "test",
    };
    const mcpServers: McpServerIR[] = [
      {
        name: "my-server",
        type: "stdio",
        command: "node",
        args: ["${CLAUDE_PLUGIN_ROOT}/server.js"],
      },
    ];
    const result = generateGeminiManifest(manifest, mcpServers, []);
    expect(result.mcpServers).toBeDefined();
    expect(result.mcpServers!["my-server"].command).toBe("node");
    expect(result.mcpServers!["my-server"].args).toEqual([
      "${extensionPath}/server.js",
    ]);
  });

  it("replaces CLAUDE_PLUGIN_ROOT with extensionPath in MCP config", () => {
    const manifest: ManifestIR = {
      name: "test",
      version: "1.0.0",
      description: "test",
    };
    const mcpServers: McpServerIR[] = [
      {
        name: "srv",
        type: "stdio",
        command: "node",
        args: ["${CLAUDE_PLUGIN_ROOT}/dist/server.js"],
        cwd: "${CLAUDE_PLUGIN_ROOT}",
      },
    ];
    const result = generateGeminiManifest(manifest, mcpServers, []);
    expect(result.mcpServers!["srv"].args![0]).toBe(
      "${extensionPath}/dist/server.js"
    );
    expect(result.mcpServers!["srv"].cwd).toBe("${extensionPath}");
  });

  it("sets contextFileName when CLAUDE.md exists", () => {
    const manifest: ManifestIR = {
      name: "test",
      version: "1.0.0",
      description: "test",
    };
    const contextFiles: ContextFileIR[] = [
      { filename: "CLAUDE.md", content: "# Test" },
    ];
    const result = generateGeminiManifest(manifest, [], contextFiles);
    expect(result.contextFileName).toBe("GEMINI.md");
  });

  it("omits contextFileName when no context files exist", () => {
    const manifest: ManifestIR = {
      name: "test",
      version: "1.0.0",
      description: "test",
    };
    const result = generateGeminiManifest(manifest, [], []);
    expect(result.contextFileName).toBeUndefined();
  });
});
