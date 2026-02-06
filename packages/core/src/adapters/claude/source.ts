import { access } from "fs/promises";
import { join } from "path";
import type { SourceAdapter } from "../types.js";
import type { PluginIR, UnsupportedComponent } from "../../ir/types.js";
import { parseClaudeManifest } from "./parsers/manifest.js";
import { parseClaudeCommands } from "./parsers/commands.js";
import { parseClaudeSkills } from "./parsers/skills.js";
import {
  parseClaudeHooksFile,
  parseClaudeHooksFromObject,
} from "./parsers/hooks.js";
import {
  parseClaudeMcpFile,
  parseClaudeMcpFromObject,
} from "./parsers/mcp.js";
import { parseClaudeAgents } from "./parsers/agents.js";
import { parseClaudeContext } from "./parsers/context.js";

export class ClaudeSourceAdapter implements SourceAdapter {
  name = "claude";

  async detect(path: string): Promise<boolean> {
    try {
      await access(join(path, ".claude-plugin", "plugin.json"));
      return true;
    } catch {
      return false;
    }
  }

  async parse(pluginPath: string): Promise<PluginIR> {
    const manifestResult = await parseClaudeManifest(pluginPath);
    const commands = await parseClaudeCommands(pluginPath);
    const skills = await parseClaudeSkills(pluginPath);
    const agents = await parseClaudeAgents(pluginPath);
    const contextFiles = await parseClaudeContext(pluginPath);

    // Parse hooks from file and merge with embedded
    const fileHooks = await parseClaudeHooksFile(pluginPath);
    const embeddedHooks = manifestResult.embeddedHooks
      ? parseClaudeHooksFromObject(manifestResult.embeddedHooks)
      : { hooks: [], unsupported: [] };

    // Parse MCP from file and merge with embedded
    const fileMcp = await parseClaudeMcpFile(pluginPath);
    const embeddedMcp = manifestResult.embeddedMcpServers
      ? parseClaudeMcpFromObject(manifestResult.embeddedMcpServers)
      : [];

    // Collect unsupported components
    const unsupported: UnsupportedComponent[] = [
      ...fileHooks.unsupported,
      ...embeddedHooks.unsupported,
    ];

    for (const cmd of commands) {
      if (cmd.allowedTools) {
        unsupported.push({
          type: "command-feature",
          name: `${cmd.name}:allowed-tools`,
          reason: "allowed-tools has no equivalent in target ecosystems",
          sourceEcosystem: "claude",
        });
      }
      if (cmd.disableModelInvocation) {
        unsupported.push({
          type: "command-feature",
          name: `${cmd.name}:disable-model-invocation`,
          reason:
            "disable-model-invocation has no equivalent in target ecosystems",
          sourceEcosystem: "claude",
        });
      }
    }

    return {
      manifest: manifestResult.manifest,
      commands,
      skills,
      hooks: [...fileHooks.hooks, ...embeddedHooks.hooks],
      mcpServers: [...fileMcp, ...embeddedMcp],
      contextFiles,
      agents,
      unsupported,
    };
  }
}
