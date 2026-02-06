import { describe, it, expect } from "vitest";
import { AdapterRegistry } from "../../../src/adapters/registry.js";
import type { SourceAdapter, TargetAdapter } from "../../../src/adapters/types.js";

const mockSource: SourceAdapter = {
  name: "mock-source",
  detect: async () => true,
  parse: async () => ({
    manifest: { name: "test", version: "1.0.0", description: "test" },
    commands: [],
    skills: [],
    hooks: [],
    mcpServers: [],
    contextFiles: [],
    agents: [],
    unsupported: [],
  }),
};

const mockTarget: TargetAdapter = {
  name: "mock-target",
  generate: async () => ({
    source: "mock-source",
    target: "mock-target",
    pluginName: "test",
    translated: [],
    skipped: [],
    warnings: [],
  }),
};

describe("AdapterRegistry", () => {
  it("registers and retrieves source adapters", () => {
    const registry = new AdapterRegistry();
    registry.registerSource(mockSource);
    expect(registry.getSource("mock-source")).toBe(mockSource);
  });

  it("registers and retrieves target adapters", () => {
    const registry = new AdapterRegistry();
    registry.registerTarget(mockTarget);
    expect(registry.getTarget("mock-target")).toBe(mockTarget);
  });

  it("throws for unknown source adapter", () => {
    const registry = new AdapterRegistry();
    expect(() => registry.getSource("nonexistent")).toThrow(
      'Unknown source adapter: "nonexistent"'
    );
  });

  it("throws for unknown target adapter", () => {
    const registry = new AdapterRegistry();
    expect(() => registry.getTarget("nonexistent")).toThrow(
      'Unknown target adapter: "nonexistent"'
    );
  });

  it("lists registered adapters", () => {
    const registry = new AdapterRegistry();
    registry.registerSource(mockSource);
    registry.registerTarget(mockTarget);
    expect(registry.listSources()).toEqual(["mock-source"]);
    expect(registry.listTargets()).toEqual(["mock-target"]);
  });

  it("auto-detects source adapter from path", async () => {
    const registry = new AdapterRegistry();
    registry.registerSource(mockSource);
    const detected = await registry.detectSource("/some/path");
    expect(detected).toBe(mockSource);
  });
});
