import { readdir, stat } from "fs/promises";
import { join } from "path";
import { AdapterRegistry } from "./adapters/registry.js";
import { ClaudeSourceAdapter } from "./adapters/claude/source.js";
import { GeminiTargetAdapter } from "./adapters/gemini/target.js";
import type { TranslationReport } from "./adapters/types.js";

export function createDefaultRegistry(): AdapterRegistry {
  const registry = new AdapterRegistry();
  registry.registerSource(new ClaudeSourceAdapter());
  registry.registerTarget(new GeminiTargetAdapter());
  return registry;
}

export interface TranslateOptions {
  from?: string;
  to: string;
  source: string;
  output: string;
}

export async function translate(
  options: TranslateOptions,
  registry?: AdapterRegistry
): Promise<TranslationReport> {
  const reg = registry ?? createDefaultRegistry();

  const sourceAdapter = options.from
    ? reg.getSource(options.from)
    : await reg.detectSource(options.source);

  if (!sourceAdapter) {
    throw new Error(
      `Could not detect source format at "${options.source}". Use --from to specify.`
    );
  }

  const targetAdapter = reg.getTarget(options.to);
  const ir = await sourceAdapter.parse(options.source);
  return targetAdapter.generate(ir, options.output);
}

export interface TranslateMarketplaceOptions {
  from?: string;
  to: string;
  source: string;
  outputDir: string;
}

export async function translateMarketplace(
  options: TranslateMarketplaceOptions,
  registry?: AdapterRegistry
): Promise<TranslationReport[]> {
  const reg = registry ?? createDefaultRegistry();
  const reports: TranslationReport[] = [];

  const entries = await readdir(options.source);
  for (const entry of entries) {
    const entryPath = join(options.source, entry);
    const entryStat = await stat(entryPath);
    if (!entryStat.isDirectory()) continue;

    const sourceAdapter = options.from
      ? reg.getSource(options.from)
      : await reg.detectSource(entryPath);

    if (!sourceAdapter) continue;

    const targetAdapter = reg.getTarget(options.to);
    const ir = await sourceAdapter.parse(entryPath);
    const outputPath = join(options.outputDir, ir.manifest.name);
    const report = await targetAdapter.generate(ir, outputPath);
    reports.push(report);
  }

  return reports;
}
