import { readFile, access } from "fs/promises";
import { join, resolve } from "path";

export interface MarketplacePluginRef {
  name: string;
  description?: string;
  type: "local" | "remote";
  resolvedPath: string; // absolute path for local, git URL for remote
}

export interface ParsedMarketplace {
  name: string;
  plugins: MarketplacePluginRef[];
}

interface RawMarketplacePlugin {
  name: string;
  description?: string;
  source: string | { source: "url"; url: string };
}

interface RawMarketplaceJson {
  name?: string;
  plugins: RawMarketplacePlugin[];
}

const MARKETPLACE_JSON_PATH = ".claude-plugin/marketplace.json";

export async function hasMarketplaceJson(dirPath: string): Promise<boolean> {
  try {
    await access(join(dirPath, MARKETPLACE_JSON_PATH));
    return true;
  } catch {
    return false;
  }
}

export async function parseClaudeMarketplace(
  marketplacePath: string
): Promise<ParsedMarketplace> {
  const filePath = join(marketplacePath, MARKETPLACE_JSON_PATH);
  const raw: RawMarketplaceJson = JSON.parse(
    await readFile(filePath, "utf-8")
  );

  if (!raw.plugins || !Array.isArray(raw.plugins)) {
    throw new Error(
      `Invalid marketplace.json: missing or invalid "plugins" array`
    );
  }

  const plugins: MarketplacePluginRef[] = raw.plugins.map((entry) => {
    if (!entry.name) {
      throw new Error(`Invalid marketplace.json: plugin entry missing "name"`);
    }

    if (typeof entry.source === "string") {
      return {
        name: entry.name,
        description: entry.description,
        type: "local" as const,
        resolvedPath: resolve(marketplacePath, entry.source),
      };
    }

    if (
      typeof entry.source === "object" &&
      entry.source.source === "url" &&
      typeof entry.source.url === "string"
    ) {
      return {
        name: entry.name,
        description: entry.description,
        type: "remote" as const,
        resolvedPath: entry.source.url,
      };
    }

    throw new Error(
      `Invalid marketplace.json: plugin "${entry.name}" has unrecognized source format`
    );
  });

  return {
    name: raw.name ?? "unnamed-marketplace",
    plugins,
  };
}
