import { execFileSync } from "child_process";
import type { PluginIR } from "./ir/types.js";
import type {
  TranslationReport,
  ValidationResult,
  ParityResult,
} from "./adapters/types.js";

/**
 * Item-by-item parity check: every IR component must appear in
 * translated or skipped, and vice versa.
 */
export function checkTranslationParity(
  ir: PluginIR,
  report: TranslationReport
): ParityResult {
  const errors: string[] = [];

  const translatedSet = new Set(
    report.translated.map((t) => `${t.type}:${t.name}`)
  );
  const skippedSet = new Set(
    report.skipped.map((s) => `${s.type}:${s.name}`)
  );

  // Check each IR component category was translated
  for (const cmd of ir.commands) {
    if (!translatedSet.has(`command:${cmd.name}`)) {
      errors.push(`missing translated command: "${cmd.name}"`);
    }
  }

  for (const skill of ir.skills) {
    if (!translatedSet.has(`skill:${skill.name}`)) {
      errors.push(`missing translated skill: "${skill.name}"`);
    }
  }

  for (const agent of ir.agents) {
    if (!translatedSet.has(`agent:${agent.name}`)) {
      errors.push(`missing translated agent: "${agent.name}"`);
    }
  }

  for (const mcp of ir.mcpServers) {
    if (!translatedSet.has(`mcp-server:${mcp.name}`)) {
      errors.push(`missing translated mcp-server: "${mcp.name}"`);
    }
  }

  // Hooks: count-based check since multiple hooks can share the same event name
  const irHookCount = ir.hooks.length;
  const translatedHookCount = report.translated.filter(
    (t) => t.type === "hook"
  ).length;
  if (translatedHookCount !== irHookCount) {
    errors.push(
      `hooks: expected ${irHookCount} translated, got ${translatedHookCount}`
    );
  }

  // Context: multiple source context files merge into 1 output
  const expectedContext = ir.contextFiles.length > 0 ? 1 : 0;
  const translatedContext = report.translated.filter(
    (t) => t.type === "context"
  ).length;
  if (translatedContext !== expectedContext) {
    errors.push(
      `context: expected ${expectedContext} translated, got ${translatedContext}`
    );
  }

  // Manifest must always be translated
  const hasManifest = report.translated.some((t) => t.type === "manifest");
  if (!hasManifest) {
    errors.push("missing translated manifest");
  }

  // Unsupported IR components must all appear in skipped
  for (const u of ir.unsupported) {
    if (!skippedSet.has(`${u.type}:${u.name}`)) {
      errors.push(`missing skipped component: ${u.type}:"${u.name}"`);
    }
  }

  // Count totals for summary check
  const totalIrComponents =
    1 + // manifest
    ir.commands.length +
    ir.skills.length +
    ir.hooks.length +
    ir.mcpServers.length +
    ir.agents.length +
    expectedContext;
  const totalReported = report.translated.length;
  if (totalReported !== totalIrComponents) {
    errors.push(
      `total translated: expected ${totalIrComponents}, got ${totalReported}`
    );
  }

  const totalSkipped = report.skipped.length;
  if (totalSkipped !== ir.unsupported.length) {
    errors.push(
      `total skipped: expected ${ir.unsupported.length}, got ${totalSkipped}`
    );
  }

  return { passed: errors.length === 0, errors };
}

export function isGeminiCliAvailable(): boolean {
  try {
    execFileSync("gemini", ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export function runGeminiValidate(extensionDir: string): {
  passed: boolean;
  error?: string;
} {
  try {
    execFileSync("gemini", ["extensions", "validate", extensionDir], {
      stdio: "pipe",
    });
    return { passed: true };
  } catch (err) {
    const stderr = (err as { stderr?: Buffer }).stderr?.toString() ?? "";
    const stdout = (err as { stdout?: Buffer }).stdout?.toString() ?? "";
    return { passed: false, error: stderr || stdout || (err as Error).message };
  }
}

export interface ValidateOptions {
  /** Run `gemini extensions validate` if CLI is available. Default: false */
  geminiValidate?: boolean;
}

/**
 * Run full validation: parity check always runs,
 * gemini CLI validate only when opted in.
 */
export function validateTranslation(
  ir: PluginIR,
  report: TranslationReport,
  extensionDir: string,
  options: ValidateOptions = {}
): ValidationResult {
  const parity = checkTranslationParity(ir, report);

  let geminiCli: { passed: boolean; error?: string } | undefined;
  if (options.geminiValidate && isGeminiCliAvailable()) {
    geminiCli = runGeminiValidate(extensionDir);
  }

  return {
    valid: parity.passed && (geminiCli?.passed ?? true),
    parity,
    geminiCli,
  };
}
