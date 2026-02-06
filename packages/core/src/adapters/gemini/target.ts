import { mkdir, writeFile, readdir, copyFile } from "fs/promises";
import { join } from "path";
import type {
  TargetAdapter,
  TranslationReport,
  ComponentSummary,
  SkippedComponent,
  GenerateOptions,
} from "../types.js";
import type { PluginIR } from "../../ir/types.js";
import { generateGeminiManifest } from "./generators/manifest.js";
import { generateGeminiCommand } from "./generators/commands.js";
import { generateGeminiSkill } from "./generators/skills.js";
import { generateGeminiHooks } from "./generators/hooks.js";
import { generateGeminiAgent } from "./generators/agents.js";
import { generateGeminiContext } from "./generators/context.js";

export class GeminiTargetAdapter implements TargetAdapter {
  name = "gemini";

  async generate(
    ir: PluginIR,
    outputPath: string,
    options?: GenerateOptions
  ): Promise<TranslationReport> {
    const translated: ComponentSummary[] = [];
    const skipped: SkippedComponent[] = [];
    const warnings: string[] = [];

    await mkdir(outputPath, { recursive: true });

    // Manifest
    const manifest = generateGeminiManifest(
      ir.manifest,
      ir.mcpServers,
      ir.contextFiles
    );
    await writeFile(
      join(outputPath, "gemini-extension.json"),
      JSON.stringify(manifest, null, 2) + "\n"
    );
    translated.push({ type: "manifest", name: ir.manifest.name });

    // Commands
    if (ir.commands.length > 0) {
      const commandsDir = join(outputPath, "commands");
      await mkdir(commandsDir, { recursive: true });
      for (const cmd of ir.commands) {
        const result = generateGeminiCommand(cmd);
        await writeFile(
          join(commandsDir, `${cmd.name}.toml`),
          result.toml + "\n"
        );
        translated.push({ type: "command", name: cmd.name });
        if (result.warnings) {
          for (const w of result.warnings) {
            warnings.push(`command "${cmd.name}": ${w}`);
          }
        }
      }
    }

    // Skills
    for (const skill of ir.skills) {
      const skillDir = join(outputPath, "skills", skill.name);
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, "SKILL.md"),
        generateGeminiSkill(skill) + "\n"
      );
      translated.push({ type: "skill", name: skill.name });
    }

    // Hooks
    if (ir.hooks.length > 0) {
      const hooksResult = generateGeminiHooks(ir.hooks);
      const hooksDir = join(outputPath, "hooks");
      await mkdir(hooksDir, { recursive: true });
      await writeFile(
        join(hooksDir, "hooks.json"),
        JSON.stringify(hooksResult.hooksJson, null, 2) + "\n"
      );
      for (const hook of ir.hooks) {
        translated.push({ type: "hook", name: hook.event });
      }
      warnings.push(...hooksResult.warnings);

      // Copy hook script files from source
      if (options?.sourcePath) {
        const sourceHooksDir = join(options.sourcePath, "hooks");
        try {
          const entries = await readdir(sourceHooksDir);
          for (const entry of entries) {
            if (entry === "hooks.json") continue;
            await copyFile(
              join(sourceHooksDir, entry),
              join(hooksDir, entry)
            );
          }
        } catch {
          // Source hooks dir may not exist (embedded hooks)
        }
      }
    }

    // Agents
    if (ir.agents.length > 0) {
      const agentsDir = join(outputPath, "agents");
      await mkdir(agentsDir, { recursive: true });
      for (const agent of ir.agents) {
        const result = generateGeminiAgent(agent);
        await writeFile(
          join(agentsDir, `${agent.name}.md`),
          result.content + "\n"
        );
        translated.push({ type: "agent", name: agent.name });
        warnings.push(...result.warnings);
      }
    }

    // Context
    const contextResult = generateGeminiContext(ir.contextFiles);
    if (contextResult) {
      await writeFile(
        join(outputPath, contextResult.filename),
        contextResult.content + "\n"
      );
      translated.push({ type: "context", name: contextResult.filename });
    }

    // MCP servers (already in manifest)
    for (const server of ir.mcpServers) {
      translated.push({ type: "mcp-server", name: server.name });
    }

    // Skipped
    for (const u of ir.unsupported) {
      skipped.push({ type: u.type, name: u.name, reason: u.reason });
    }

    // Metadata
    await writeFile(
      join(outputPath, ".pluginx-meta.json"),
      JSON.stringify(
        {
          from: "claude",
          to: "gemini",
          translatedAt: new Date().toISOString(),
          translatorVersion: "0.1.0",
        },
        null,
        2
      ) + "\n"
    );

    const report: TranslationReport = {
      source: "claude",
      target: "gemini",
      pluginName: ir.manifest.name,
      translated,
      skipped,
      warnings,
    };

    await writeFile(
      join(outputPath, ".translation-report.json"),
      JSON.stringify(report, null, 2) + "\n"
    );

    return report;
  }
}
