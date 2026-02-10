import type { SkillIR } from "../../../ir/types.js";

const CLAUDE_ONLY_KEYS = new Set(["allowed-tools"]);

interface SkillResult {
  content: string;
  warnings: string[];
}

/**
 * Ordered most-specific-first to avoid partial matches.
 */
const CONTENT_REPLACEMENTS: { pattern: RegExp; replacement: string; label: string }[] = [
  { pattern: /\$\{CLAUDE_PLUGIN_ROOT\}/g, replacement: "${extensionPath}", label: "path variable ${CLAUDE_PLUGIN_ROOT}" },
  { pattern: /CLAUDE_PLUGIN_ROOT/g, replacement: "extensionPath", label: "path variable CLAUDE_PLUGIN_ROOT" },
  { pattern: /~\/\.claude\//g, replacement: "~/.gemini/", label: "path ~/.claude/" },
  { pattern: /Claude Code/g, replacement: "Gemini CLI", label: "tool name reference" },
  { pattern: /\*\*For Claude:\*\*/g, replacement: "**For Gemini:**", label: "bold directive pattern" },
  { pattern: /For Claude:/g, replacement: "For Gemini:", label: "plain directive pattern" },
  { pattern: /\bin Claude\b/g, replacement: "in Gemini", label: "contextual 'in Claude' reference" },
];

export function adaptSkillContent(content: string): { content: string; warnings: string[] } {
  const warnings: string[] = [];
  let adapted = content;

  for (const { pattern, replacement, label } of CONTENT_REPLACEMENTS) {
    // Reset lastIndex for global regexps
    pattern.lastIndex = 0;
    if (pattern.test(adapted)) {
      warnings.push(`adapted skill content: replaced ${label}`);
      pattern.lastIndex = 0;
      adapted = adapted.replace(pattern, replacement);
    }
  }

  return { content: adapted, warnings };
}

export function generateGeminiSkill(skill: SkillIR): SkillResult {
  const frontmatter: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(skill.frontmatter)) {
    if (!CLAUDE_ONLY_KEYS.has(key)) {
      frontmatter[key] = value;
    }
  }

  const yamlLines = Object.entries(frontmatter).map(
    ([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`
  );

  const { content: adaptedContent, warnings } = adaptSkillContent(skill.content);

  return {
    content: `---\n${yamlLines.join("\n")}\n---\n\n${adaptedContent}`,
    warnings,
  };
}
