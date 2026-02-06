export interface PluginIR {
  manifest: ManifestIR;
  commands: CommandIR[];
  skills: SkillIR[];
  hooks: HookIR[];
  mcpServers: McpServerIR[];
  contextFiles: ContextFileIR[];
  agents: AgentIR[];
  unsupported: UnsupportedComponent[];
}

export interface ManifestIR {
  name: string;
  version: string;
  description: string;
  author?: { name: string; email?: string; url?: string };
  homepage?: string;
  repository?: string;
  keywords?: string[];
  settings?: SettingIR[];
}

export interface SettingIR {
  name: string;
  description: string;
  envVar: string;
  sensitive?: boolean;
}

export interface CommandIR {
  name: string;
  group?: string;
  description: string;
  prompt: string;
  argumentHint?: string;
  shellInjections: ShellInjection[];
  allowedTools?: string[];
  disableModelInvocation?: boolean;
}

export interface ShellInjection {
  original: string;
  command: string;
}

export interface SkillIR {
  name: string;
  description: string;
  version?: string;
  content: string;
  frontmatter: Record<string, unknown>;
}

export interface HookIR {
  event: string;
  matcher?: string;
  command: string;
  timeout: number;
  sourceEvent: string;
}

export interface McpServerIR {
  name: string;
  type: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  headers?: Record<string, string>;
}

export interface ContextFileIR {
  filename: string;
  content: string;
}

export interface AgentIR {
  name: string;
  description: string;
  content: string;
  model?: string;
  frontmatter: Record<string, unknown>;
}

export interface UnsupportedComponent {
  type: string;
  name: string;
  reason: string;
  sourceEcosystem: string;
}
