import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@epiphytic/ai-plugin-translator", () => ({
  runList: vi.fn(),
}));

import { runList } from "@epiphytic/ai-plugin-translator";

const mockRunList = vi.mocked(runList);

describe("pluginx_list tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty list when no plugins", async () => {
    mockRunList.mockResolvedValue([]);

    const plugins = await runList({});
    expect(plugins).toEqual([]);
  });

  it("returns plugin data", async () => {
    mockRunList.mockResolvedValue([
      {
        name: "test-plugin",
        sourceType: "git",
        sourceUrl: "https://github.com/test/plugin.git",
        sourcePath: "/tmp/sources/test-plugin",
        outputPath: "/tmp/translations/test-plugin",
        type: "single",
        lastTranslated: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const plugins = await runList({});
    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe("test-plugin");
    expect(plugins[0].sourceType).toBe("git");
  });
});
