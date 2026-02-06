import { readFile } from "fs/promises";
import { join } from "path";
import type { ManifestIR } from "../../../ir/types.js";

interface ClaudeManifestRaw {
  name: string;
  description: string;
  version?: string;
  author?: { name: string; email?: string; url?: string };
  repository?: string;
  homepage?: string;
  license?: string;
  keywords?: string[];
  hooks?: Record<string, unknown>;
  mcpServers?: Record<string, unknown>;
  agents?: string[];
}

export interface ClaudeManifestResult {
  manifest: ManifestIR;
  embeddedHooks?: Record<string, unknown>;
  embeddedMcpServers?: Record<string, unknown>;
  embeddedAgentPaths?: string[];
}

export async function parseClaudeManifest(
  pluginPath: string
): Promise<ClaudeManifestResult> {
  const manifestPath = join(pluginPath, ".claude-plugin", "plugin.json");
  const raw: ClaudeManifestRaw = JSON.parse(
    await readFile(manifestPath, "utf-8")
  );

  const manifest: ManifestIR = {
    name: raw.name,
    version: raw.version ?? "0.0.0",
    description: raw.description,
    author: raw.author,
    homepage: raw.homepage,
    repository: raw.repository,
    keywords: raw.keywords,
  };

  return {
    manifest,
    embeddedHooks: raw.hooks as Record<string, unknown> | undefined,
    embeddedMcpServers: raw.mcpServers as Record<string, unknown> | undefined,
    embeddedAgentPaths: raw.agents,
  };
}
