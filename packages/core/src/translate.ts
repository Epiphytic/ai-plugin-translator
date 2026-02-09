import { readdir, stat } from "fs/promises";
import { writeFile } from "fs/promises";
import { join } from "path";
import { AdapterRegistry } from "./adapters/registry.js";
import { ClaudeSourceAdapter } from "./adapters/claude/source.js";
import { GeminiTargetAdapter } from "./adapters/gemini/target.js";
import type { TranslationReport } from "./adapters/types.js";
import {
  hasMarketplaceJson,
  parseClaudeMarketplace,
} from "./adapters/claude/parsers/marketplace.js";
import { cloneToTemp, type ClonedRepo } from "./utils/git.js";
import { validateTranslation, type ValidateOptions } from "./validate.js";

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
  /** Run `gemini extensions validate` after translation. Default: false */
  geminiValidate?: boolean;
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
  const report = await targetAdapter.generate(ir, options.output, {
    sourcePath: options.source,
  });

  // Post-translation validation: parity check always runs,
  // gemini CLI validate only when opted in
  const validateOpts: ValidateOptions = {
    geminiValidate: options.geminiValidate,
  };
  report.validation = validateTranslation(
    ir,
    report,
    options.output,
    validateOpts
  );

  // Re-write report file with validation results
  await writeFile(
    join(options.output, ".translation-report.json"),
    JSON.stringify(report, null, 2) + "\n"
  );

  return report;
}

export interface TranslateMarketplaceOptions {
  from?: string;
  to: string;
  source: string;
  outputDir: string;
  /** Run `gemini extensions validate` after translation. Default: false */
  geminiValidate?: boolean;
}

export async function translateMarketplace(
  options: TranslateMarketplaceOptions,
  registry?: AdapterRegistry
): Promise<TranslationReport[]> {
  const reg = registry ?? createDefaultRegistry();

  if (await hasMarketplaceJson(options.source)) {
    return translateMarketplaceFromJson(options, reg);
  }

  return translateMarketplaceFromDirScan(options, reg);
}

async function translateMarketplaceFromJson(
  options: TranslateMarketplaceOptions,
  reg: AdapterRegistry
): Promise<TranslationReport[]> {
  const marketplace = await parseClaudeMarketplace(options.source);
  const reports: TranslationReport[] = [];
  const clonedRepos: ClonedRepo[] = [];

  const validateOpts: ValidateOptions = {
    geminiValidate: options.geminiValidate,
  };

  try {
    for (const plugin of marketplace.plugins) {
      let pluginPath: string;

      if (plugin.type === "remote") {
        const cloned = await cloneToTemp(plugin.resolvedPath);
        clonedRepos.push(cloned);
        pluginPath = cloned.path;
      } else {
        pluginPath = plugin.resolvedPath;
      }

      const sourceAdapter = options.from
        ? reg.getSource(options.from)
        : await reg.detectSource(pluginPath);

      if (!sourceAdapter) continue;

      const targetAdapter = reg.getTarget(options.to);
      const ir = await sourceAdapter.parse(pluginPath);
      const outputPath = join(options.outputDir, ir.manifest.name);
      const report = await targetAdapter.generate(ir, outputPath, {
        sourcePath: pluginPath,
      });

      report.validation = validateTranslation(
        ir,
        report,
        outputPath,
        validateOpts
      );
      await writeFile(
        join(outputPath, ".translation-report.json"),
        JSON.stringify(report, null, 2) + "\n"
      );

      reports.push(report);
    }
  } finally {
    for (const repo of clonedRepos) {
      await repo.cleanup();
    }
  }

  return reports;
}

async function translateMarketplaceFromDirScan(
  options: TranslateMarketplaceOptions,
  reg: AdapterRegistry
): Promise<TranslationReport[]> {
  const reports: TranslationReport[] = [];

  const validateOpts: ValidateOptions = {
    geminiValidate: options.geminiValidate,
  };

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
    const report = await targetAdapter.generate(ir, outputPath, {
      sourcePath: entryPath,
    });

    report.validation = validateTranslation(
      ir,
      report,
      outputPath,
      validateOpts
    );
    await writeFile(
      join(outputPath, ".translation-report.json"),
      JSON.stringify(report, null, 2) + "\n"
    );

    reports.push(report);
  }

  return reports;
}
