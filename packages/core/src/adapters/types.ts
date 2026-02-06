import type { PluginIR } from "../ir/types.js";

export interface SourceAdapter {
  name: string;
  detect(path: string): Promise<boolean>;
  parse(path: string): Promise<PluginIR>;
}

export interface GenerateOptions {
  sourcePath?: string;
}

export interface TargetAdapter {
  name: string;
  generate(
    ir: PluginIR,
    outputPath: string,
    options?: GenerateOptions
  ): Promise<TranslationReport>;
}

export interface TranslationReport {
  source: string;
  target: string;
  pluginName: string;
  translated: ComponentSummary[];
  skipped: SkippedComponent[];
  warnings: string[];
  validation?: ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  parity: ParityResult;
  geminiCli?: { passed: boolean; error?: string };
}

export interface ParityResult {
  passed: boolean;
  errors: string[];
}

export interface ComponentSummary {
  type: string;
  name: string;
  notes?: string;
}

export interface SkippedComponent {
  type: string;
  name: string;
  reason: string;
}
