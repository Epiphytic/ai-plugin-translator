import { readFile, readdir, stat } from "fs/promises";
import { join } from "path";
import matter from "gray-matter";
import type { SkillIR } from "../../../ir/types.js";

export async function parseClaudeSkills(
  pluginPath: string
): Promise<SkillIR[]> {
  const skillsDir = join(pluginPath, "skills");
  let entries: string[];
  try {
    entries = await readdir(skillsDir);
  } catch {
    return [];
  }

  const skills: SkillIR[] = [];
  for (const entry of entries) {
    const entryPath = join(skillsDir, entry);
    const entryStat = await stat(entryPath);

    if (entryStat.isDirectory()) {
      const skillFile = join(entryPath, "SKILL.md");
      try {
        const raw = await readFile(skillFile, "utf-8");
        skills.push(parseSkillFile(entry, raw));
      } catch {
        // No SKILL.md in this directory, skip
      }
    }
  }

  return skills;
}

function parseSkillFile(dirName: string, raw: string): SkillIR {
  const { data, content } = matter(raw);

  return {
    name: (data.name as string) ?? dirName,
    description: (data.description as string) ?? "",
    version: data.version as string | undefined,
    content: content.trim(),
    frontmatter: data,
  };
}
