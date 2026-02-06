import { readFile, readdir } from "fs/promises";
import { join, basename } from "path";
import matter from "gray-matter";
import type { CommandIR, ShellInjection } from "../../../ir/types.js";

export async function parseClaudeCommands(
  pluginPath: string
): Promise<CommandIR[]> {
  const commandsDir = join(pluginPath, "commands");
  let entries: string[];
  try {
    entries = await readdir(commandsDir);
  } catch {
    return [];
  }

  const commands: CommandIR[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const filePath = join(commandsDir, entry);
    const raw = await readFile(filePath, "utf-8");
    commands.push(parseCommandFile(entry, raw));
  }

  return commands.sort((a, b) => a.name.localeCompare(b.name));
}

function parseCommandFile(filename: string, raw: string): CommandIR {
  const { data, content } = matter(raw);
  const name = basename(filename, ".md");

  const shellInjections = extractShellInjections(content);
  const prompt = normalizePrompt(content);

  return {
    name,
    description: data.description ?? "",
    prompt,
    argumentHint: data["argument-hint"],
    shellInjections,
    allowedTools: data["allowed-tools"]
      ? String(data["allowed-tools"])
          .split(",")
          .map((t: string) => t.trim())
      : undefined,
    disableModelInvocation: data["disable-model-invocation"],
  };
}

function extractShellInjections(content: string): ShellInjection[] {
  const pattern = /!`([^`]+)`/g;
  const injections: ShellInjection[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    injections.push({ original: match[0], command: match[1] });
  }
  return injections;
}

function normalizePrompt(content: string): string {
  return content
    .replace(/!`([^`]+)`/g, "!{$1}")
    .replace(/\$ARGUMENTS/g, "{{args}}");
}
