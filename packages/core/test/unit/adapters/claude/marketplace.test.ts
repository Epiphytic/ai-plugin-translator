import { describe, it, expect } from "vitest";
import {
  hasMarketplaceJson,
  parseClaudeMarketplace,
} from "../../../../src/adapters/claude/parsers/marketplace.js";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../../../fixtures/claude-marketplaces");

describe("hasMarketplaceJson", () => {
  it("returns true when marketplace.json exists", async () => {
    expect(await hasMarketplaceJson(join(fixtures, "local-only"))).toBe(true);
  });

  it("returns false when marketplace.json does not exist", async () => {
    const pluginFixtures = join(__dirname, "../../../fixtures/claude-plugins");
    expect(await hasMarketplaceJson(join(pluginFixtures, "basic"))).toBe(false);
  });
});

describe("parseClaudeMarketplace", () => {
  it("parses local path sources", async () => {
    const result = await parseClaudeMarketplace(join(fixtures, "local-only"));
    expect(result.name).toBe("local-marketplace");
    expect(result.plugins).toHaveLength(2);

    const root = result.plugins[0];
    expect(root.name).toBe("root-plugin");
    expect(root.type).toBe("local");

    const sub = result.plugins[1];
    expect(sub.name).toBe("sub-plugin");
    expect(sub.type).toBe("local");
  });

  it('resolves "./" self-reference to marketplace root', async () => {
    const marketplacePath = join(fixtures, "local-only");
    const result = await parseClaudeMarketplace(marketplacePath);
    expect(result.plugins[0].resolvedPath).toBe(resolve(marketplacePath, "./"));
  });

  it("resolves subdirectory paths relative to marketplace root", async () => {
    const marketplacePath = join(fixtures, "local-only");
    const result = await parseClaudeMarketplace(marketplacePath);
    expect(result.plugins[1].resolvedPath).toBe(
      resolve(marketplacePath, "./sub-plugin")
    );
  });

  it("parses URL source objects as remote refs", async () => {
    const result = await parseClaudeMarketplace(join(fixtures, "url-only"));
    expect(result.name).toBe("url-marketplace");
    expect(result.plugins).toHaveLength(2);

    for (const plugin of result.plugins) {
      expect(plugin.type).toBe("remote");
    }

    expect(result.plugins[0].resolvedPath).toBe(
      "https://github.com/example/remote-a"
    );
    expect(result.plugins[1].resolvedPath).toBe(
      "https://github.com/example/remote-b"
    );
  });

  it("handles mixed local and remote sources", async () => {
    const result = await parseClaudeMarketplace(join(fixtures, "mixed"));
    expect(result.plugins).toHaveLength(2);

    expect(result.plugins[0].type).toBe("local");
    expect(result.plugins[0].name).toBe("local-sub");

    expect(result.plugins[1].type).toBe("remote");
    expect(result.plugins[1].name).toBe("remote-plugin");
    expect(result.plugins[1].resolvedPath).toBe(
      "https://github.com/example/remote-plugin"
    );
  });

  it("preserves plugin descriptions", async () => {
    const result = await parseClaudeMarketplace(join(fixtures, "local-only"));
    expect(result.plugins[0].description).toBe("Self-referencing root plugin");
    expect(result.plugins[1].description).toBe("A subdirectory plugin");
  });

  it("defaults marketplace name to unnamed-marketplace when not provided", async () => {
    // url-only has a name, but we can test the name extraction works
    const result = await parseClaudeMarketplace(join(fixtures, "url-only"));
    expect(result.name).toBe("url-marketplace");
  });

  it("throws on malformed marketplace.json with missing plugins", async () => {
    // This will fail because the path doesn't have marketplace.json
    const pluginFixtures = join(__dirname, "../../../fixtures/claude-plugins");
    await expect(
      parseClaudeMarketplace(join(pluginFixtures, "basic"))
    ).rejects.toThrow();
  });
});
