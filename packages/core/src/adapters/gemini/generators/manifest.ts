import type {
  ManifestIR,
  McpServerIR,
  ContextFileIR,
} from "../../../ir/types.js";

interface GeminiMcpServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  headers?: Record<string, string>;
}

export interface GeminiManifest {
  name: string;
  version: string;
  description: string;
  mcpServers?: Record<string, GeminiMcpServerConfig>;
  contextFileName?: string;
}

function replacePathVars(value: string): string {
  return value.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, "${extensionPath}");
}

export function generateGeminiManifest(
  manifest: ManifestIR,
  mcpServers: McpServerIR[],
  contextFiles: ContextFileIR[]
): GeminiManifest {
  const result: GeminiManifest = {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
  };

  if (mcpServers.length > 0) {
    result.mcpServers = {};
    for (const server of mcpServers) {
      const config: GeminiMcpServerConfig = {};
      if (server.type === "stdio") {
        if (server.command) config.command = replacePathVars(server.command);
        if (server.args) config.args = server.args.map(replacePathVars);
        if (server.env) config.env = server.env;
        if (server.cwd) config.cwd = replacePathVars(server.cwd);
      } else {
        if (server.url) config.url = server.url;
        if (server.headers) config.headers = server.headers;
      }
      result.mcpServers[server.name] = config;
    }
  }

  if (contextFiles.length > 0) {
    result.contextFileName = "GEMINI.md";
  }

  return result;
}
