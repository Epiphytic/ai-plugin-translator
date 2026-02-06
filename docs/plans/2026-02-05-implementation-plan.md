# AI Plugin Translator - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a deterministic CLI that translates Claude Code plugins into Gemini CLI extensions, with adapter architecture for future ecosystems.

**Architecture:** Monorepo with two packages: `core` (npm CLI with IR types, source/target adapters, registry) and `gemini-extension` (thin wrapper with `/pluginx` TOML commands). Claude adapter parses plugin files into a normalized IR. Gemini adapter generates extension files from the IR. Translation report captures what mapped, what was skipped, and why.

**Tech Stack:** TypeScript, Node.js 20+, pnpm workspaces, vitest, gray-matter (frontmatter), @iarna/toml (TOML writer), commander (CLI)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json` (workspace root)
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/gemini-extension/gemini-extension.json`
- Modify: `.gitignore`

**Step 1: Create workspace root files**

`package.json`:
```json
{
  "name": "ai-plugin-translator-root",
  "private": true,
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "dist"
  }
}
```

Update `.gitignore` to include:
```
node_modules/
dist/
.fork-join/
*.tgz
```

**Step 2: Create core package**

`packages/core/package.json`:
```json
{
  "name": "ai-plugin-translator",
  "version": "0.1.0",
  "description": "Deterministic CLI to translate AI coding agent plugins between ecosystems",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "ai-plugin-translator": "dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "keywords": ["claude", "gemini", "plugin", "translator", "extension"],
  "license": "MIT",
  "repository": "https://github.com/badal-io/ai-plugin-translator"
}
```

`packages/core/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

**Step 3: Create Gemini extension scaffold**

`packages/gemini-extension/gemini-extension.json`:
```json
{
  "name": "pluginx",
  "version": "0.1.0",
  "description": "Translate and manage Claude Code plugins as Gemini CLI extensions"
}
```

**Step 4: Install dependencies**

Run:
```bash
cd /Users/liam.helmer/repos/badal-io/ai-plugin-translator
pnpm install
cd packages/core
pnpm add gray-matter @iarna/toml commander
pnpm add -D vitest typescript @types/node
```

**Step 5: Verify setup builds**

Run: `pnpm build` from workspace root
Expected: Clean compilation (no source files yet, but tsconfig resolves)

**Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore packages/
git commit -m "chore: scaffold monorepo with core and gemini-extension packages"
```

---

### Task 2: IR Type Definitions

**Files:**
- Create: `packages/core/src/ir/types.ts`
- Create: `packages/core/src/ir/index.ts`

**Step 1: Write the IR types**

`packages/core/src/ir/types.ts`:
```typescript
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
```

`packages/core/src/ir/index.ts`:
```typescript
export * from "./types.js";
```

**Step 2: Write type compilation test**

Run: `cd packages/core && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/core/src/ir/
git commit -m "feat: add intermediate representation type definitions"
```

---

### Task 3: Adapter Interfaces and Registry

**Files:**
- Create: `packages/core/src/adapters/types.ts`
- Create: `packages/core/src/adapters/registry.ts`
- Create: `packages/core/src/adapters/index.ts`
- Test: `packages/core/test/unit/adapters/registry.test.ts`

**Step 1: Write the failing test**

`packages/core/test/unit/adapters/registry.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { AdapterRegistry } from "../../../src/adapters/registry.js";
import type { SourceAdapter, TargetAdapter } from "../../../src/adapters/types.js";

const mockSource: SourceAdapter = {
  name: "mock-source",
  detect: async () => true,
  parse: async () => ({
    manifest: { name: "test", version: "1.0.0", description: "test" },
    commands: [],
    skills: [],
    hooks: [],
    mcpServers: [],
    contextFiles: [],
    agents: [],
    unsupported: [],
  }),
};

const mockTarget: TargetAdapter = {
  name: "mock-target",
  generate: async () => ({
    source: "mock-source",
    target: "mock-target",
    pluginName: "test",
    translated: [],
    skipped: [],
    warnings: [],
  }),
};

describe("AdapterRegistry", () => {
  it("registers and retrieves source adapters", () => {
    const registry = new AdapterRegistry();
    registry.registerSource(mockSource);
    expect(registry.getSource("mock-source")).toBe(mockSource);
  });

  it("registers and retrieves target adapters", () => {
    const registry = new AdapterRegistry();
    registry.registerTarget(mockTarget);
    expect(registry.getTarget("mock-target")).toBe(mockTarget);
  });

  it("throws for unknown source adapter", () => {
    const registry = new AdapterRegistry();
    expect(() => registry.getSource("nonexistent")).toThrow(
      'Unknown source adapter: "nonexistent"'
    );
  });

  it("throws for unknown target adapter", () => {
    const registry = new AdapterRegistry();
    expect(() => registry.getTarget("nonexistent")).toThrow(
      'Unknown target adapter: "nonexistent"'
    );
  });

  it("lists registered adapters", () => {
    const registry = new AdapterRegistry();
    registry.registerSource(mockSource);
    registry.registerTarget(mockTarget);
    expect(registry.listSources()).toEqual(["mock-source"]);
    expect(registry.listTargets()).toEqual(["mock-target"]);
  });

  it("auto-detects source adapter from path", async () => {
    const registry = new AdapterRegistry();
    registry.registerSource(mockSource);
    const detected = await registry.detectSource("/some/path");
    expect(detected).toBe(mockSource);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run test/unit/adapters/registry.test.ts`
Expected: FAIL (modules don't exist yet)

**Step 3: Write adapter interfaces**

`packages/core/src/adapters/types.ts`:
```typescript
import type { PluginIR } from "../ir/types.js";

export interface SourceAdapter {
  name: string;
  detect(path: string): Promise<boolean>;
  parse(path: string): Promise<PluginIR>;
}

export interface TargetAdapter {
  name: string;
  generate(ir: PluginIR, outputPath: string): Promise<TranslationReport>;
}

export interface TranslationReport {
  source: string;
  target: string;
  pluginName: string;
  translated: ComponentSummary[];
  skipped: SkippedComponent[];
  warnings: string[];
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
```

**Step 4: Write the registry**

`packages/core/src/adapters/registry.ts`:
```typescript
import type { SourceAdapter, TargetAdapter } from "./types.js";

export class AdapterRegistry {
  private sources = new Map<string, SourceAdapter>();
  private targets = new Map<string, TargetAdapter>();

  registerSource(adapter: SourceAdapter): void {
    this.sources.set(adapter.name, adapter);
  }

  registerTarget(adapter: TargetAdapter): void {
    this.targets.set(adapter.name, adapter);
  }

  getSource(name: string): SourceAdapter {
    const adapter = this.sources.get(name);
    if (!adapter) {
      throw new Error(`Unknown source adapter: "${name}"`);
    }
    return adapter;
  }

  getTarget(name: string): TargetAdapter {
    const adapter = this.targets.get(name);
    if (!adapter) {
      throw new Error(`Unknown target adapter: "${name}"`);
    }
    return adapter;
  }

  listSources(): string[] {
    return [...this.sources.keys()];
  }

  listTargets(): string[] {
    return [...this.targets.keys()];
  }

  async detectSource(path: string): Promise<SourceAdapter | undefined> {
    for (const adapter of this.sources.values()) {
      if (await adapter.detect(path)) {
        return adapter;
      }
    }
    return undefined;
  }
}
```

`packages/core/src/adapters/index.ts`:
```typescript
export * from "./types.js";
export * from "./registry.js";
```

**Step 5: Run test to verify it passes**

Run: `cd packages/core && npx vitest run test/unit/adapters/registry.test.ts`
Expected: PASS (all 6 tests)

**Step 6: Commit**

```bash
git add packages/core/src/adapters/ packages/core/test/
git commit -m "feat: add adapter interfaces and registry"
```

---

### Task 4: Claude Manifest Parser

**Files:**
- Create: `packages/core/src/adapters/claude/parsers/manifest.ts`
- Test: `packages/core/test/unit/adapters/claude/manifest.test.ts`
- Test fixture: `packages/core/test/fixtures/claude-plugins/basic/.claude-plugin/plugin.json`
- Test fixture: `packages/core/test/fixtures/claude-plugins/full/.claude-plugin/plugin.json`

**Step 1: Create test fixtures**

`packages/core/test/fixtures/claude-plugins/basic/.claude-plugin/plugin.json`:
```json
{
  "name": "basic-plugin",
  "description": "A basic test plugin"
}
```

`packages/core/test/fixtures/claude-plugins/full/.claude-plugin/plugin.json`:
```json
{
  "name": "full-plugin",
  "version": "2.1.0",
  "description": "A full-featured test plugin",
  "author": {
    "name": "Test Author",
    "email": "test@example.com",
    "url": "https://example.com"
  },
  "repository": "https://github.com/test/full-plugin",
  "homepage": "https://full-plugin.dev",
  "license": "MIT",
  "keywords": ["test", "full-featured"],
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "echo start"
          }
        ]
      }
    ]
  },
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/server.js"]
    }
  }
}
```

**Step 2: Write the failing test**

`packages/core/test/unit/adapters/claude/manifest.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { parseClaudeManifest } from "../../../../src/adapters/claude/parsers/manifest.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../../../fixtures/claude-plugins");

describe("parseClaudeManifest", () => {
  it("parses a minimal manifest", async () => {
    const result = await parseClaudeManifest(join(fixtures, "basic"));
    expect(result.manifest.name).toBe("basic-plugin");
    expect(result.manifest.description).toBe("A basic test plugin");
    expect(result.manifest.version).toBe("0.0.0");
  });

  it("parses a full manifest with all fields", async () => {
    const result = await parseClaudeManifest(join(fixtures, "full"));
    expect(result.manifest.name).toBe("full-plugin");
    expect(result.manifest.version).toBe("2.1.0");
    expect(result.manifest.author).toEqual({
      name: "Test Author",
      email: "test@example.com",
      url: "https://example.com",
    });
    expect(result.manifest.repository).toBe(
      "https://github.com/test/full-plugin"
    );
    expect(result.manifest.homepage).toBe("https://full-plugin.dev");
    expect(result.manifest.keywords).toEqual(["test", "full-featured"]);
  });

  it("extracts embedded hooks from manifest", async () => {
    const result = await parseClaudeManifest(join(fixtures, "full"));
    expect(result.embeddedHooks).toBeDefined();
    expect(result.embeddedHooks!.SessionStart).toBeDefined();
  });

  it("extracts embedded mcpServers from manifest", async () => {
    const result = await parseClaudeManifest(join(fixtures, "full"));
    expect(result.embeddedMcpServers).toBeDefined();
    expect(result.embeddedMcpServers!["my-server"]).toBeDefined();
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd packages/core && npx vitest run test/unit/adapters/claude/manifest.test.ts`
Expected: FAIL

**Step 4: Write the parser**

`packages/core/src/adapters/claude/parsers/manifest.ts`:
```typescript
import { readFile } from "fs/promises";
import { join } from "path";
import type { ManifestIR } from "../../../ir/types.js";

interface ClaudeManifestRaw {
  name: string;
  description: string;
  version?: string;
  author?: { name: string; email?: string; url?: string };
  repository?: string;
  homepage?: string;
  license?: string;
  keywords?: string[];
  hooks?: Record<string, unknown>;
  mcpServers?: Record<string, unknown>;
  agents?: string[];
}

export interface ClaudeManifestResult {
  manifest: ManifestIR;
  embeddedHooks?: Record<string, unknown>;
  embeddedMcpServers?: Record<string, unknown>;
  embeddedAgentPaths?: string[];
}

export async function parseClaudeManifest(
  pluginPath: string
): Promise<ClaudeManifestResult> {
  const manifestPath = join(pluginPath, ".claude-plugin", "plugin.json");
  const raw: ClaudeManifestRaw = JSON.parse(
    await readFile(manifestPath, "utf-8")
  );

  const manifest: ManifestIR = {
    name: raw.name,
    version: raw.version ?? "0.0.0",
    description: raw.description,
    author: raw.author,
    homepage: raw.homepage,
    repository: raw.repository,
    keywords: raw.keywords,
  };

  return {
    manifest,
    embeddedHooks: raw.hooks as Record<string, unknown> | undefined,
    embeddedMcpServers: raw.mcpServers as Record<string, unknown> | undefined,
    embeddedAgentPaths: raw.agents,
  };
}
```

**Step 5: Run test to verify it passes**

Run: `cd packages/core && npx vitest run test/unit/adapters/claude/manifest.test.ts`
Expected: PASS (all 4 tests)

**Step 6: Commit**

```bash
git add packages/core/src/adapters/claude/ packages/core/test/
git commit -m "feat: add Claude manifest parser"
```

---

### Task 5: Claude Commands Parser

**Files:**
- Create: `packages/core/src/adapters/claude/parsers/commands.ts`
- Test: `packages/core/test/unit/adapters/claude/commands.test.ts`
- Test fixture: `packages/core/test/fixtures/claude-plugins/full/commands/commit.md`
- Test fixture: `packages/core/test/fixtures/claude-plugins/full/commands/search.md`

**Step 1: Create test fixtures**

`packages/core/test/fixtures/claude-plugins/full/commands/commit.md`:
```markdown
---
description: Create a git commit
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
---

## Context
- Current git status: !`git status`
- Current git diff: !`git diff HEAD`

## Your task
Based on the above changes, create a single git commit with message: $ARGUMENTS
```

`packages/core/test/fixtures/claude-plugins/full/commands/search.md`:
```markdown
---
description: Search the codebase
argument-hint: <search-term>
---

Search for $ARGUMENTS in the codebase using ripgrep:
!`rg $ARGUMENTS .`
```

**Step 2: Write the failing test**

`packages/core/test/unit/adapters/claude/commands.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { parseClaudeCommands } from "../../../../src/adapters/claude/parsers/commands.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../../../fixtures/claude-plugins");

describe("parseClaudeCommands", () => {
  it("parses commands from a plugin directory", async () => {
    const commands = await parseClaudeCommands(join(fixtures, "full"));
    expect(commands).toHaveLength(2);
  });

  it("extracts description from frontmatter", async () => {
    const commands = await parseClaudeCommands(join(fixtures, "full"));
    const commit = commands.find((c) => c.name === "commit");
    expect(commit).toBeDefined();
    expect(commit!.description).toBe("Create a git commit");
  });

  it("normalizes $ARGUMENTS to {{args}}", async () => {
    const commands = await parseClaudeCommands(join(fixtures, "full"));
    const commit = commands.find((c) => c.name === "commit");
    expect(commit!.prompt).toContain("{{args}}");
    expect(commit!.prompt).not.toContain("$ARGUMENTS");
  });

  it("normalizes shell injections from backtick to brace format", async () => {
    const commands = await parseClaudeCommands(join(fixtures, "full"));
    const commit = commands.find((c) => c.name === "commit");
    expect(commit!.prompt).toContain("!{git status}");
    expect(commit!.shellInjections).toHaveLength(2);
  });

  it("captures allowed-tools from frontmatter", async () => {
    const commands = await parseClaudeCommands(join(fixtures, "full"));
    const commit = commands.find((c) => c.name === "commit");
    expect(commit!.allowedTools).toEqual([
      "Bash(git add:*)",
      "Bash(git status:*)",
      "Bash(git commit:*)",
    ]);
  });

  it("captures argument-hint from frontmatter", async () => {
    const commands = await parseClaudeCommands(join(fixtures, "full"));
    const search = commands.find((c) => c.name === "search");
    expect(search!.argumentHint).toBe("<search-term>");
  });

  it("returns empty array when no commands directory exists", async () => {
    const commands = await parseClaudeCommands(join(fixtures, "basic"));
    expect(commands).toEqual([]);
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd packages/core && npx vitest run test/unit/adapters/claude/commands.test.ts`
Expected: FAIL

**Step 4: Write the parser**

`packages/core/src/adapters/claude/parsers/commands.ts`:
```typescript
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
  const regex = /!`([^`]+)`/g;
  const injections: ShellInjection[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    injections.push({ original: match[0], command: match[1] });
  }
  return injections;
}

function normalizePrompt(content: string): string {
  return content
    .replace(/!`([^`]+)`/g, "!{$1}")
    .replace(/\$ARGUMENTS/g, "{{args}}");
}
```

**Step 5: Run test to verify it passes**

Run: `cd packages/core && npx vitest run test/unit/adapters/claude/commands.test.ts`
Expected: PASS (all 7 tests)

**Step 6: Commit**

```bash
git add packages/core/src/adapters/claude/parsers/commands.ts packages/core/test/
git commit -m "feat: add Claude commands parser with argument and shell injection normalization"
```

---

### Task 6: Claude Skills Parser

**Files:**
- Create: `packages/core/src/adapters/claude/parsers/skills.ts`
- Test: `packages/core/test/unit/adapters/claude/skills.test.ts`
- Test fixture: `packages/core/test/fixtures/claude-plugins/full/skills/code-review/SKILL.md`

**Step 1: Create test fixture**

`packages/core/test/fixtures/claude-plugins/full/skills/code-review/SKILL.md`:
```markdown
---
name: code-review
description: Reviews code for best practices. Trigger when user asks for code review.
allowed-tools: "Read,Bash(git diff:*)"
version: "1.0.0"
author: "Test Author <https://example.com>"
license: "MIT"
---

# Code Review

When reviewing code, check for:
1. Code organization
2. Error handling
3. Test coverage
```

**Step 2: Write the failing test**

`packages/core/test/unit/adapters/claude/skills.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { parseClaudeSkills } from "../../../../src/adapters/claude/parsers/skills.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../../../fixtures/claude-plugins");

describe("parseClaudeSkills", () => {
  it("parses skills from a plugin directory", async () => {
    const skills = await parseClaudeSkills(join(fixtures, "full"));
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("code-review");
  });

  it("extracts frontmatter fields", async () => {
    const skills = await parseClaudeSkills(join(fixtures, "full"));
    expect(skills[0].description).toBe(
      "Reviews code for best practices. Trigger when user asks for code review."
    );
    expect(skills[0].version).toBe("1.0.0");
  });

  it("preserves full frontmatter including extra fields", async () => {
    const skills = await parseClaudeSkills(join(fixtures, "full"));
    expect(skills[0].frontmatter["allowed-tools"]).toBe("Read,Bash(git diff:*)");
    expect(skills[0].frontmatter["author"]).toBe(
      "Test Author <https://example.com>"
    );
  });

  it("extracts content body without frontmatter", async () => {
    const skills = await parseClaudeSkills(join(fixtures, "full"));
    expect(skills[0].content).toContain("# Code Review");
    expect(skills[0].content).not.toContain("---");
  });

  it("returns empty array when no skills directory exists", async () => {
    const skills = await parseClaudeSkills(join(fixtures, "basic"));
    expect(skills).toEqual([]);
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd packages/core && npx vitest run test/unit/adapters/claude/skills.test.ts`
Expected: FAIL

**Step 4: Write the parser**

`packages/core/src/adapters/claude/parsers/skills.ts`:
```typescript
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
```

**Step 5: Run test to verify it passes**

Run: `cd packages/core && npx vitest run test/unit/adapters/claude/skills.test.ts`
Expected: PASS (all 5 tests)

**Step 6: Commit**

```bash
git add packages/core/src/adapters/claude/parsers/skills.ts packages/core/test/
git commit -m "feat: add Claude skills parser"
```

---

### Task 7: Claude Hooks Parser

**Files:**
- Create: `packages/core/src/adapters/claude/parsers/hooks.ts`
- Test: `packages/core/test/unit/adapters/claude/hooks.test.ts`
- Test fixture: `packages/core/test/fixtures/claude-plugins/full/hooks/hooks.json`

**Step 1: Create test fixture**

`packages/core/test/fixtures/claude-plugins/full/hooks/hooks.json`:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ${CLAUDE_PLUGIN_ROOT}/hooks/check.py",
            "timeout": 10
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post.sh"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "echo subagent done"
          }
        ]
      }
    ]
  }
}
```

**Step 2: Write the failing test**

`packages/core/test/unit/adapters/claude/hooks.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  parseClaudeHooksFile,
  parseClaudeHooksFromObject,
} from "../../../../src/adapters/claude/parsers/hooks.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../../../fixtures/claude-plugins");

describe("parseClaudeHooksFile", () => {
  it("parses hooks from hooks.json", async () => {
    const result = await parseClaudeHooksFile(join(fixtures, "full"));
    expect(result.hooks.length).toBe(2); // SubagentStop is unsupported
  });

  it("converts timeout from seconds to milliseconds", async () => {
    const result = await parseClaudeHooksFile(join(fixtures, "full"));
    const preToolUse = result.hooks.find((h) => h.event === "PreToolUse");
    expect(preToolUse!.timeout).toBe(10000);
  });

  it("preserves matcher patterns", async () => {
    const result = await parseClaudeHooksFile(join(fixtures, "full"));
    const preToolUse = result.hooks.find((h) => h.event === "PreToolUse");
    expect(preToolUse!.matcher).toBe("Write|Edit");
  });

  it("marks SubagentStop as unsupported", async () => {
    const result = await parseClaudeHooksFile(join(fixtures, "full"));
    expect(result.unsupported).toHaveLength(1);
    expect(result.unsupported[0].type).toBe("hook");
    expect(result.unsupported[0].name).toBe("SubagentStop");
  });

  it("defaults timeout to 30000ms when not specified", async () => {
    const result = await parseClaudeHooksFile(join(fixtures, "full"));
    const postToolUse = result.hooks.find((h) => h.event === "PostToolUse");
    expect(postToolUse!.timeout).toBe(30000);
  });

  it("returns empty when no hooks directory exists", async () => {
    const result = await parseClaudeHooksFile(join(fixtures, "basic"));
    expect(result.hooks).toEqual([]);
    expect(result.unsupported).toEqual([]);
  });
});

describe("parseClaudeHooksFromObject", () => {
  it("parses hooks embedded in plugin.json", () => {
    const embedded = {
      SessionStart: [
        {
          matcher: "",
          hooks: [{ type: "command", command: "echo start" }],
        },
      ],
    };
    const result = parseClaudeHooksFromObject(embedded);
    expect(result.hooks).toHaveLength(1);
    expect(result.hooks[0].event).toBe("SessionStart");
    expect(result.hooks[0].command).toBe("echo start");
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd packages/core && npx vitest run test/unit/adapters/claude/hooks.test.ts`
Expected: FAIL

**Step 4: Write the parser**

`packages/core/src/adapters/claude/parsers/hooks.ts`:
```typescript
import { readFile } from "fs/promises";
import { join } from "path";
import type { HookIR, UnsupportedComponent } from "../../../ir/types.js";

const UNSUPPORTED_EVENTS = new Set(["SubagentStop"]);
const DEFAULT_TIMEOUT_SEC = 30;

interface ClaudeHookEntry {
  type: string;
  command: string;
  timeout?: number;
}

interface ClaudeHookMatcher {
  matcher?: string;
  hooks: ClaudeHookEntry[];
}

interface HooksParseResult {
  hooks: HookIR[];
  unsupported: UnsupportedComponent[];
}

export async function parseClaudeHooksFile(
  pluginPath: string
): Promise<HooksParseResult> {
  const hooksPath = join(pluginPath, "hooks", "hooks.json");
  let raw: string;
  try {
    raw = await readFile(hooksPath, "utf-8");
  } catch {
    return { hooks: [], unsupported: [] };
  }

  const parsed = JSON.parse(raw);
  const hooksObj = parsed.hooks ?? parsed;
  return parseClaudeHooksFromObject(hooksObj);
}

export function parseClaudeHooksFromObject(
  hooksObj: Record<string, unknown>
): HooksParseResult {
  const hooks: HookIR[] = [];
  const unsupported: UnsupportedComponent[] = [];

  for (const [event, matchers] of Object.entries(hooksObj)) {
    if (UNSUPPORTED_EVENTS.has(event)) {
      unsupported.push({
        type: "hook",
        name: event,
        reason: `No target ecosystem equivalent for "${event}" hook event`,
        sourceEcosystem: "claude",
      });
      continue;
    }

    for (const matcherGroup of matchers as ClaudeHookMatcher[]) {
      for (const hookEntry of matcherGroup.hooks) {
        hooks.push({
          event,
          matcher: matcherGroup.matcher || undefined,
          command: hookEntry.command,
          timeout: (hookEntry.timeout ?? DEFAULT_TIMEOUT_SEC) * 1000,
          sourceEvent: event,
        });
      }
    }
  }

  return { hooks, unsupported };
}
```

**Step 5: Run test to verify it passes**

Run: `cd packages/core && npx vitest run test/unit/adapters/claude/hooks.test.ts`
Expected: PASS (all 7 tests)

**Step 6: Commit**

```bash
git add packages/core/src/adapters/claude/parsers/hooks.ts packages/core/test/
git commit -m "feat: add Claude hooks parser with timeout normalization and unsupported event detection"
```

---

### Task 8: Claude MCP, Agents, and Context Parsers

**Files:**
- Create: `packages/core/src/adapters/claude/parsers/mcp.ts`
- Create: `packages/core/src/adapters/claude/parsers/agents.ts`
- Create: `packages/core/src/adapters/claude/parsers/context.ts`
- Test: `packages/core/test/unit/adapters/claude/mcp.test.ts`
- Test: `packages/core/test/unit/adapters/claude/agents.test.ts`
- Test fixtures (see below)

**Step 1: Create test fixtures**

`packages/core/test/fixtures/claude-plugins/full/.mcp.json`:
```json
{
  "my-mcp": {
    "command": "npx",
    "args": ["-y", "@example/mcp-server"]
  },
  "http-server": {
    "type": "http",
    "url": "https://api.example.com/mcp",
    "headers": {
      "Authorization": "Bearer ${MY_API_KEY}"
    }
  }
}
```

`packages/core/test/fixtures/claude-plugins/full/agents/code-simplifier.md`:
```markdown
---
name: code-simplifier
description: Simplifies code for clarity and maintainability
model: opus
---

You are an expert code simplification specialist.
Focus on clarity and readability.
```

`packages/core/test/fixtures/claude-plugins/full/CLAUDE.md`:
```markdown
# Full Plugin

This plugin does full things.
```

**Step 2: Write the failing tests**

`packages/core/test/unit/adapters/claude/mcp.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  parseClaudeMcpFile,
  parseClaudeMcpFromObject,
} from "../../../../src/adapters/claude/parsers/mcp.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../../../fixtures/claude-plugins");

describe("parseClaudeMcpFile", () => {
  it("parses stdio MCP servers from .mcp.json", async () => {
    const servers = await parseClaudeMcpFile(join(fixtures, "full"));
    const stdio = servers.find((s) => s.name === "my-mcp");
    expect(stdio).toBeDefined();
    expect(stdio!.type).toBe("stdio");
    expect(stdio!.command).toBe("npx");
    expect(stdio!.args).toEqual(["-y", "@example/mcp-server"]);
  });

  it("parses HTTP MCP servers from .mcp.json", async () => {
    const servers = await parseClaudeMcpFile(join(fixtures, "full"));
    const http = servers.find((s) => s.name === "http-server");
    expect(http).toBeDefined();
    expect(http!.type).toBe("http");
    expect(http!.url).toBe("https://api.example.com/mcp");
    expect(http!.headers).toEqual({
      Authorization: "Bearer ${MY_API_KEY}",
    });
  });

  it("returns empty array when no .mcp.json exists", async () => {
    const servers = await parseClaudeMcpFile(join(fixtures, "basic"));
    expect(servers).toEqual([]);
  });
});

describe("parseClaudeMcpFromObject", () => {
  it("parses embedded mcpServers from plugin.json", () => {
    const embedded = {
      "my-server": {
        command: "node",
        args: ["server.js"],
        env: { FOO: "bar" },
      },
    };
    const servers = parseClaudeMcpFromObject(embedded);
    expect(servers).toHaveLength(1);
    expect(servers[0].name).toBe("my-server");
    expect(servers[0].env).toEqual({ FOO: "bar" });
  });
});
```

`packages/core/test/unit/adapters/claude/agents.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { parseClaudeAgents } from "../../../../src/adapters/claude/parsers/agents.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../../../fixtures/claude-plugins");

describe("parseClaudeAgents", () => {
  it("parses agents from agents directory", async () => {
    const agents = await parseClaudeAgents(join(fixtures, "full"));
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe("code-simplifier");
  });

  it("extracts description and model from frontmatter", async () => {
    const agents = await parseClaudeAgents(join(fixtures, "full"));
    expect(agents[0].description).toBe(
      "Simplifies code for clarity and maintainability"
    );
    expect(agents[0].model).toBe("opus");
  });

  it("extracts content body without frontmatter", async () => {
    const agents = await parseClaudeAgents(join(fixtures, "full"));
    expect(agents[0].content).toContain(
      "You are an expert code simplification specialist."
    );
    expect(agents[0].content).not.toContain("---");
  });

  it("returns empty array when no agents directory exists", async () => {
    const agents = await parseClaudeAgents(join(fixtures, "basic"));
    expect(agents).toEqual([]);
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `cd packages/core && npx vitest run test/unit/adapters/claude/mcp.test.ts test/unit/adapters/claude/agents.test.ts`
Expected: FAIL

**Step 4: Write the parsers**

`packages/core/src/adapters/claude/parsers/mcp.ts`:
```typescript
import { readFile } from "fs/promises";
import { join } from "path";
import type { McpServerIR } from "../../../ir/types.js";

interface McpServerRaw {
  type?: "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  headers?: Record<string, string>;
}

export async function parseClaudeMcpFile(
  pluginPath: string
): Promise<McpServerIR[]> {
  const mcpPath = join(pluginPath, ".mcp.json");
  let raw: string;
  try {
    raw = await readFile(mcpPath, "utf-8");
  } catch {
    return [];
  }

  const parsed: Record<string, McpServerRaw> = JSON.parse(raw);
  return parseClaudeMcpFromObject(parsed);
}

export function parseClaudeMcpFromObject(
  obj: Record<string, unknown>
): McpServerIR[] {
  const servers: McpServerIR[] = [];

  for (const [name, config] of Object.entries(obj)) {
    const raw = config as McpServerRaw;
    const isHttp = raw.type === "http" || raw.url != null;

    servers.push({
      name,
      type: isHttp ? "http" : "stdio",
      command: raw.command,
      args: raw.args,
      env: raw.env,
      cwd: raw.cwd,
      url: raw.url,
      headers: raw.headers,
    });
  }

  return servers;
}
```

`packages/core/src/adapters/claude/parsers/agents.ts`:
```typescript
import { readFile, readdir } from "fs/promises";
import { join, basename } from "path";
import matter from "gray-matter";
import type { AgentIR } from "../../../ir/types.js";

export async function parseClaudeAgents(
  pluginPath: string
): Promise<AgentIR[]> {
  const agentsDir = join(pluginPath, "agents");
  let entries: string[];
  try {
    entries = await readdir(agentsDir);
  } catch {
    return [];
  }

  const agents: AgentIR[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const filePath = join(agentsDir, entry);
    const raw = await readFile(filePath, "utf-8");
    agents.push(parseAgentFile(entry, raw));
  }

  return agents;
}

function parseAgentFile(filename: string, raw: string): AgentIR {
  const { data, content } = matter(raw);
  const fallbackName = basename(filename, ".md");

  return {
    name: (data.name as string) ?? fallbackName,
    description: (data.description as string) ?? "",
    content: content.trim(),
    model: data.model as string | undefined,
    frontmatter: data,
  };
}
```

`packages/core/src/adapters/claude/parsers/context.ts`:
```typescript
import { readFile } from "fs/promises";
import { join } from "path";
import type { ContextFileIR } from "../../../ir/types.js";

const CONTEXT_FILES = ["CLAUDE.md"];

export async function parseClaudeContext(
  pluginPath: string
): Promise<ContextFileIR[]> {
  const contextFiles: ContextFileIR[] = [];

  for (const filename of CONTEXT_FILES) {
    try {
      const content = await readFile(join(pluginPath, filename), "utf-8");
      contextFiles.push({ filename, content });
    } catch {
      // File doesn't exist, skip
    }
  }

  return contextFiles;
}
```

**Step 5: Run tests to verify they pass**

Run: `cd packages/core && npx vitest run test/unit/adapters/claude/mcp.test.ts test/unit/adapters/claude/agents.test.ts`
Expected: PASS (all 7 tests)

**Step 6: Commit**

```bash
git add packages/core/src/adapters/claude/parsers/ packages/core/test/
git commit -m "feat: add Claude MCP, agents, and context file parsers"
```

---

### Task 9: Claude Source Adapter (Compose All Parsers)

**Files:**
- Create: `packages/core/src/adapters/claude/source.ts`
- Create: `packages/core/src/adapters/claude/index.ts`
- Test: `packages/core/test/unit/adapters/claude/source.test.ts`

**Step 1: Write the failing test**

`packages/core/test/unit/adapters/claude/source.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { ClaudeSourceAdapter } from "../../../../src/adapters/claude/source.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../../../fixtures/claude-plugins");

describe("ClaudeSourceAdapter", () => {
  const adapter = new ClaudeSourceAdapter();

  it("has name 'claude'", () => {
    expect(adapter.name).toBe("claude");
  });

  it("detects a Claude plugin directory", async () => {
    expect(await adapter.detect(join(fixtures, "full"))).toBe(true);
  });

  it("returns false for non-Claude directories", async () => {
    expect(await adapter.detect(join(fixtures, "nonexistent"))).toBe(false);
  });

  it("parses a full plugin into PluginIR", async () => {
    const ir = await adapter.parse(join(fixtures, "full"));

    expect(ir.manifest.name).toBe("full-plugin");
    expect(ir.commands.length).toBeGreaterThan(0);
    expect(ir.skills.length).toBeGreaterThan(0);
    expect(ir.hooks.length).toBeGreaterThan(0);
    expect(ir.mcpServers.length).toBeGreaterThan(0);
    expect(ir.agents.length).toBeGreaterThan(0);
    expect(ir.contextFiles.length).toBeGreaterThan(0);
  });

  it("merges hooks from both hooks.json and embedded plugin.json", async () => {
    const ir = await adapter.parse(join(fixtures, "full"));
    const events = ir.hooks.map((h) => h.event);
    expect(events).toContain("PreToolUse");
    expect(events).toContain("PostToolUse");
    expect(events).toContain("SessionStart");
  });

  it("merges MCP servers from both .mcp.json and embedded plugin.json", async () => {
    const ir = await adapter.parse(join(fixtures, "full"));
    const names = ir.mcpServers.map((s) => s.name);
    expect(names).toContain("my-mcp");
    expect(names).toContain("http-server");
    expect(names).toContain("my-server");
  });

  it("collects unsupported components", async () => {
    const ir = await adapter.parse(join(fixtures, "full"));
    expect(ir.unsupported.length).toBeGreaterThan(0);
    expect(ir.unsupported.find((u) => u.name === "SubagentStop")).toBeDefined();
  });

  it("parses a minimal plugin without errors", async () => {
    const ir = await adapter.parse(join(fixtures, "basic"));
    expect(ir.manifest.name).toBe("basic-plugin");
    expect(ir.commands).toEqual([]);
    expect(ir.skills).toEqual([]);
    expect(ir.hooks).toEqual([]);
    expect(ir.mcpServers).toEqual([]);
    expect(ir.agents).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run test/unit/adapters/claude/source.test.ts`
Expected: FAIL

**Step 3: Write the source adapter**

`packages/core/src/adapters/claude/source.ts`:
```typescript
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
```

`packages/core/src/adapters/claude/index.ts`:
```typescript
export { ClaudeSourceAdapter } from "./source.js";
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run test/unit/adapters/claude/source.test.ts`
Expected: PASS (all 8 tests)

**Step 5: Run all Claude parser tests together**

Run: `cd packages/core && npx vitest run test/unit/adapters/claude/`
Expected: PASS (all tests)

**Step 6: Commit**

```bash
git add packages/core/src/adapters/claude/ packages/core/test/
git commit -m "feat: add Claude source adapter composing all parsers"
```

---

### Task 10: Gemini Manifest Generator

**Files:**
- Create: `packages/core/src/adapters/gemini/generators/manifest.ts`
- Test: `packages/core/test/unit/adapters/gemini/manifest.test.ts`

**Step 1: Write the failing test**

`packages/core/test/unit/adapters/gemini/manifest.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { generateGeminiManifest } from "../../../../src/adapters/gemini/generators/manifest.js";
import type { ManifestIR, McpServerIR, ContextFileIR } from "../../../../src/ir/types.js";

describe("generateGeminiManifest", () => {
  it("generates basic manifest with required fields", () => {
    const manifest: ManifestIR = {
      name: "my-plugin",
      version: "1.0.0",
      description: "Test plugin",
    };
    const result = generateGeminiManifest(manifest, [], []);
    expect(result.name).toBe("my-plugin");
    expect(result.version).toBe("1.0.0");
    expect(result.description).toBe("Test plugin");
  });

  it("embeds MCP servers in manifest", () => {
    const manifest: ManifestIR = {
      name: "test",
      version: "1.0.0",
      description: "test",
    };
    const mcpServers: McpServerIR[] = [
      {
        name: "my-server",
        type: "stdio",
        command: "node",
        args: ["${CLAUDE_PLUGIN_ROOT}/server.js"],
      },
    ];
    const result = generateGeminiManifest(manifest, mcpServers, []);
    expect(result.mcpServers).toBeDefined();
    expect(result.mcpServers!["my-server"].command).toBe("node");
    expect(result.mcpServers!["my-server"].args).toEqual([
      "${extensionPath}/server.js",
    ]);
  });

  it("replaces CLAUDE_PLUGIN_ROOT with extensionPath in MCP config", () => {
    const manifest: ManifestIR = {
      name: "test",
      version: "1.0.0",
      description: "test",
    };
    const mcpServers: McpServerIR[] = [
      {
        name: "srv",
        type: "stdio",
        command: "node",
        args: ["${CLAUDE_PLUGIN_ROOT}/dist/server.js"],
        cwd: "${CLAUDE_PLUGIN_ROOT}",
      },
    ];
    const result = generateGeminiManifest(manifest, mcpServers, []);
    expect(result.mcpServers!["srv"].args![0]).toBe(
      "${extensionPath}/dist/server.js"
    );
    expect(result.mcpServers!["srv"].cwd).toBe("${extensionPath}");
  });

  it("sets contextFileName when CLAUDE.md exists", () => {
    const manifest: ManifestIR = {
      name: "test",
      version: "1.0.0",
      description: "test",
    };
    const contextFiles: ContextFileIR[] = [
      { filename: "CLAUDE.md", content: "# Test" },
    ];
    const result = generateGeminiManifest(manifest, [], contextFiles);
    expect(result.contextFileName).toBe("GEMINI.md");
  });

  it("omits contextFileName when no context files exist", () => {
    const manifest: ManifestIR = {
      name: "test",
      version: "1.0.0",
      description: "test",
    };
    const result = generateGeminiManifest(manifest, [], []);
    expect(result.contextFileName).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run test/unit/adapters/gemini/manifest.test.ts`
Expected: FAIL

**Step 3: Write the generator**

`packages/core/src/adapters/gemini/generators/manifest.ts`:
```typescript
import type {
  ManifestIR,
  McpServerIR,
  ContextFileIR,
} from "../../../ir/types.js";

interface GeminiMcpServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  headers?: Record<string, string>;
}

interface GeminiManifest {
  name: string;
  version: string;
  description: string;
  mcpServers?: Record<string, GeminiMcpServerConfig>;
  contextFileName?: string;
}

function replacePathVars(value: string): string {
  return value.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, "${extensionPath}");
}

export function generateGeminiManifest(
  manifest: ManifestIR,
  mcpServers: McpServerIR[],
  contextFiles: ContextFileIR[]
): GeminiManifest {
  const result: GeminiManifest = {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
  };

  if (mcpServers.length > 0) {
    result.mcpServers = {};
    for (const server of mcpServers) {
      const config: GeminiMcpServerConfig = {};
      if (server.type === "stdio") {
        if (server.command) config.command = replacePathVars(server.command);
        if (server.args) config.args = server.args.map(replacePathVars);
        if (server.env) config.env = server.env;
        if (server.cwd) config.cwd = replacePathVars(server.cwd);
      } else {
        if (server.url) config.url = server.url;
        if (server.headers) config.headers = server.headers;
      }
      result.mcpServers[server.name] = config;
    }
  }

  if (contextFiles.length > 0) {
    result.contextFileName = "GEMINI.md";
  }

  return result;
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run test/unit/adapters/gemini/manifest.test.ts`
Expected: PASS (all 5 tests)

**Step 5: Commit**

```bash
git add packages/core/src/adapters/gemini/ packages/core/test/
git commit -m "feat: add Gemini manifest generator with MCP embedding and path variable replacement"
```

---

### Task 11: Gemini Commands Generator

**Files:**
- Create: `packages/core/src/adapters/gemini/generators/commands.ts`
- Test: `packages/core/test/unit/adapters/gemini/commands.test.ts`

**Step 1: Write the failing test**

`packages/core/test/unit/adapters/gemini/commands.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { generateGeminiCommand } from "../../../../src/adapters/gemini/generators/commands.js";
import type { CommandIR } from "../../../../src/ir/types.js";

describe("generateGeminiCommand", () => {
  it("generates TOML with prompt field", () => {
    const cmd: CommandIR = {
      name: "greet",
      description: "Say hello",
      prompt: "Say hello to {{args}}",
      shellInjections: [],
    };
    const result = generateGeminiCommand(cmd);
    expect(result.toml).toContain('prompt = """Say hello to {{args}}"""');
  });

  it("preserves shell injections in brace format", () => {
    const cmd: CommandIR = {
      name: "status",
      description: "Show status",
      prompt: "Status:\n!{git status}\nDiff:\n!{git diff}",
      shellInjections: [
        { original: "!`git status`", command: "git status" },
        { original: "!`git diff`", command: "git diff" },
      ],
    };
    const result = generateGeminiCommand(cmd);
    expect(result.toml).toContain("!{git status}");
    expect(result.toml).toContain("!{git diff}");
  });

  it("preserves {{args}} syntax", () => {
    const cmd: CommandIR = {
      name: "search",
      description: "Search for text",
      prompt: "Search for {{args}} in the codebase",
      shellInjections: [],
    };
    const result = generateGeminiCommand(cmd);
    expect(result.toml).toContain("{{args}}");
  });

  it("returns warnings for allowed-tools", () => {
    const cmd: CommandIR = {
      name: "test",
      description: "Test",
      prompt: "Test",
      shellInjections: [],
      allowedTools: ["Bash(git:*)"],
    };
    const result = generateGeminiCommand(cmd);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!).toContain(
      "allowed-tools not supported in Gemini TOML commands"
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run test/unit/adapters/gemini/commands.test.ts`
Expected: FAIL

**Step 3: Write the generator**

`packages/core/src/adapters/gemini/generators/commands.ts`:
```typescript
import type { CommandIR } from "../../../ir/types.js";

export interface CommandGeneratorResult {
  toml: string;
  warnings?: string[];
}

export function generateGeminiCommand(cmd: CommandIR): CommandGeneratorResult {
  const warnings: string[] = [];

  if (cmd.allowedTools) {
    warnings.push("allowed-tools not supported in Gemini TOML commands");
  }
  if (cmd.disableModelInvocation) {
    warnings.push(
      "disable-model-invocation not supported in Gemini TOML commands"
    );
  }

  const toml = `prompt = """${cmd.prompt}"""`;

  return {
    toml,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run test/unit/adapters/gemini/commands.test.ts`
Expected: PASS (all 4 tests)

**Step 5: Commit**

```bash
git add packages/core/src/adapters/gemini/generators/commands.ts packages/core/test/
git commit -m "feat: add Gemini TOML command generator"
```

---

### Task 12: Gemini Hooks Generator

**Files:**
- Create: `packages/core/src/adapters/gemini/generators/hooks.ts`
- Test: `packages/core/test/unit/adapters/gemini/hooks.test.ts`

**Step 1: Write the failing test**

`packages/core/test/unit/adapters/gemini/hooks.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { generateGeminiHooks } from "../../../../src/adapters/gemini/generators/hooks.js";
import type { HookIR } from "../../../../src/ir/types.js";

describe("generateGeminiHooks", () => {
  it("maps PreToolUse to BeforeTool", () => {
    const hooks: HookIR[] = [
      {
        event: "PreToolUse",
        command: "echo check",
        timeout: 5000,
        sourceEvent: "PreToolUse",
      },
    ];
    const result = generateGeminiHooks(hooks);
    expect(result.hooksJson.hooks.BeforeTool).toBeDefined();
  });

  it("maps PostToolUse to AfterTool", () => {
    const hooks: HookIR[] = [
      {
        event: "PostToolUse",
        matcher: "Bash",
        command: "echo done",
        timeout: 10000,
        sourceEvent: "PostToolUse",
      },
    ];
    const result = generateGeminiHooks(hooks);
    expect(result.hooksJson.hooks.AfterTool).toBeDefined();
    expect(result.hooksJson.hooks.AfterTool[0].matcher).toBe("Bash");
  });

  it("replaces CLAUDE_PLUGIN_ROOT with extensionPath in commands", () => {
    const hooks: HookIR[] = [
      {
        event: "PreToolUse",
        command: "python3 ${CLAUDE_PLUGIN_ROOT}/hooks/check.py",
        timeout: 5000,
        sourceEvent: "PreToolUse",
      },
    ];
    const result = generateGeminiHooks(hooks);
    const hookCmd =
      result.hooksJson.hooks.BeforeTool[0].hooks[0].command;
    expect(hookCmd).toBe("python3 ${extensionPath}/hooks/check.py");
  });

  it("preserves timeout in milliseconds", () => {
    const hooks: HookIR[] = [
      {
        event: "SessionStart",
        command: "echo start",
        timeout: 15000,
        sourceEvent: "SessionStart",
      },
    ];
    const result = generateGeminiHooks(hooks);
    expect(
      result.hooksJson.hooks.SessionStart[0].hooks[0].timeout
    ).toBe(15000);
  });

  it("adds warnings for approximate mappings", () => {
    const hooks: HookIR[] = [
      {
        event: "UserPromptSubmit",
        command: "echo submit",
        timeout: 5000,
        sourceEvent: "UserPromptSubmit",
      },
    ];
    const result = generateGeminiHooks(hooks);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("approximate");
  });

  it("returns empty hooks object for empty input", () => {
    const result = generateGeminiHooks([]);
    expect(Object.keys(result.hooksJson.hooks)).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run test/unit/adapters/gemini/hooks.test.ts`
Expected: FAIL

**Step 3: Write the generator**

`packages/core/src/adapters/gemini/generators/hooks.ts`:
```typescript
import type { HookIR } from "../../../ir/types.js";

const EVENT_MAP: Record<string, string> = {
  PreToolUse: "BeforeTool",
  PostToolUse: "AfterTool",
  PreCompact: "PreCompress",
  UserPromptSubmit: "BeforeAgent",
  Stop: "AfterAgent",
  SessionStart: "SessionStart",
  SessionEnd: "SessionEnd",
  Notification: "Notification",
};

const APPROXIMATE_MAPPINGS = new Set(["UserPromptSubmit", "Stop"]);

interface GeminiHookEntry {
  type: string;
  command: string;
  timeout: number;
}

interface GeminiHookMatcher {
  matcher?: string;
  hooks: GeminiHookEntry[];
}

interface GeminiHooksJson {
  hooks: Record<string, GeminiHookMatcher[]>;
}

export interface HooksGeneratorResult {
  hooksJson: GeminiHooksJson;
  warnings: string[];
}

function replacePathVars(value: string): string {
  return value.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, "${extensionPath}");
}

export function generateGeminiHooks(hooks: HookIR[]): HooksGeneratorResult {
  const warnings: string[] = [];
  const grouped = new Map<string, HookIR[]>();

  for (const hook of hooks) {
    const geminiEvent = EVENT_MAP[hook.event];
    if (!geminiEvent) continue;

    if (APPROXIMATE_MAPPINGS.has(hook.event)) {
      warnings.push(
        `"${hook.event}" -> "${geminiEvent}" is an approximate mapping; behavior may differ`
      );
    }

    const existing = grouped.get(geminiEvent) ?? [];
    existing.push(hook);
    grouped.set(geminiEvent, existing);
  }

  const hooksJson: GeminiHooksJson = { hooks: {} };

  for (const [geminiEvent, eventHooks] of grouped) {
    hooksJson.hooks[geminiEvent] = eventHooks.map((h) => ({
      matcher: h.matcher,
      hooks: [
        {
          type: "command",
          command: replacePathVars(h.command),
          timeout: h.timeout,
        },
      ],
    }));
  }

  return { hooksJson, warnings };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run test/unit/adapters/gemini/hooks.test.ts`
Expected: PASS (all 6 tests)

**Step 5: Commit**

```bash
git add packages/core/src/adapters/gemini/generators/hooks.ts packages/core/test/
git commit -m "feat: add Gemini hooks generator with event mapping and path variable replacement"
```

---

### Task 13: Gemini Skills, Agents, Context Generators

**Files:**
- Create: `packages/core/src/adapters/gemini/generators/skills.ts`
- Create: `packages/core/src/adapters/gemini/generators/agents.ts`
- Create: `packages/core/src/adapters/gemini/generators/context.ts`
- Test: `packages/core/test/unit/adapters/gemini/passthrough.test.ts`

**Step 1: Write the failing test**

`packages/core/test/unit/adapters/gemini/passthrough.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { generateGeminiSkill } from "../../../../src/adapters/gemini/generators/skills.js";
import { generateGeminiAgent } from "../../../../src/adapters/gemini/generators/agents.js";
import { generateGeminiContext } from "../../../../src/adapters/gemini/generators/context.js";
import type { SkillIR, AgentIR, ContextFileIR } from "../../../../src/ir/types.js";

describe("generateGeminiSkill", () => {
  it("generates SKILL.md preserving frontmatter", () => {
    const skill: SkillIR = {
      name: "review",
      description: "Review code",
      version: "1.0.0",
      content: "# Code Review\nCheck for bugs.",
      frontmatter: {
        name: "review",
        description: "Review code",
        version: "1.0.0",
        "allowed-tools": "Read,Grep",
      },
    };
    const result = generateGeminiSkill(skill);
    expect(result).toContain("---");
    expect(result).toContain("name: review");
    expect(result).toContain("# Code Review");
  });

  it("strips claude-specific frontmatter keys", () => {
    const skill: SkillIR = {
      name: "test",
      description: "test",
      content: "body",
      frontmatter: {
        name: "test",
        description: "test",
        "allowed-tools": "Read",
      },
    };
    const result = generateGeminiSkill(skill);
    expect(result).not.toContain("allowed-tools");
  });
});

describe("generateGeminiAgent", () => {
  it("generates agent markdown preserving frontmatter", () => {
    const agent: AgentIR = {
      name: "helper",
      description: "Helps with tasks",
      content: "You are a helpful assistant.",
      model: "opus",
      frontmatter: {
        name: "helper",
        description: "Helps with tasks",
        model: "opus",
      },
    };
    const result = generateGeminiAgent(agent);
    expect(result).toContain("---");
    expect(result).toContain("name: helper");
    expect(result).toContain("You are a helpful assistant.");
  });
});

describe("generateGeminiContext", () => {
  it("returns GEMINI.md with content from CLAUDE.md", () => {
    const contextFiles: ContextFileIR[] = [
      { filename: "CLAUDE.md", content: "# My Plugin\nDo things." },
    ];
    const result = generateGeminiContext(contextFiles);
    expect(result!.filename).toBe("GEMINI.md");
    expect(result!.content).toBe("# My Plugin\nDo things.");
  });

  it("returns undefined when no context files exist", () => {
    const result = generateGeminiContext([]);
    expect(result).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run test/unit/adapters/gemini/passthrough.test.ts`
Expected: FAIL

**Step 3: Write the generators**

`packages/core/src/adapters/gemini/generators/skills.ts`:
```typescript
import type { SkillIR } from "../../../ir/types.js";

const CLAUDE_ONLY_KEYS = new Set(["allowed-tools"]);

export function generateGeminiSkill(skill: SkillIR): string {
  const frontmatter: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(skill.frontmatter)) {
    if (!CLAUDE_ONLY_KEYS.has(key)) {
      frontmatter[key] = value;
    }
  }

  const yamlLines = Object.entries(frontmatter).map(
    ([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`
  );

  return `---\n${yamlLines.join("\n")}\n---\n\n${skill.content}`;
}
```

`packages/core/src/adapters/gemini/generators/agents.ts`:
```typescript
import type { AgentIR } from "../../../ir/types.js";

export function generateGeminiAgent(agent: AgentIR): string {
  const yamlLines = Object.entries(agent.frontmatter).map(
    ([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`
  );

  return `---\n${yamlLines.join("\n")}\n---\n\n${agent.content}`;
}
```

`packages/core/src/adapters/gemini/generators/context.ts`:
```typescript
import type { ContextFileIR } from "../../../ir/types.js";

interface GeneratedContextFile {
  filename: string;
  content: string;
}

export function generateGeminiContext(
  contextFiles: ContextFileIR[]
): GeneratedContextFile | undefined {
  if (contextFiles.length === 0) return undefined;

  const source = contextFiles[0];
  return {
    filename: "GEMINI.md",
    content: source.content,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run test/unit/adapters/gemini/passthrough.test.ts`
Expected: PASS (all 5 tests)

**Step 5: Commit**

```bash
git add packages/core/src/adapters/gemini/generators/ packages/core/test/
git commit -m "feat: add Gemini skills, agents, and context file generators"
```

---

### Task 14: Gemini Target Adapter and Integration Tests

**Files:**
- Create: `packages/core/src/adapters/gemini/target.ts`
- Create: `packages/core/src/adapters/gemini/index.ts`
- Test: `packages/core/test/integration/translate.test.ts`

**Step 1: Write the failing integration test**

`packages/core/test/integration/translate.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, readFileSync } from "fs";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ClaudeSourceAdapter } from "../../src/adapters/claude/source.js";
import { GeminiTargetAdapter } from "../../src/adapters/gemini/target.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../fixtures/claude-plugins");

describe("end-to-end: Claude -> Gemini", () => {
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await mkdtemp(join(tmpdir(), "pluginx-test-"));
  });

  it("translates a full Claude plugin into a Gemini extension", async () => {
    const source = new ClaudeSourceAdapter();
    const target = new GeminiTargetAdapter();

    const ir = await source.parse(join(fixtures, "full"));
    const report = await target.generate(ir, outputDir);

    // Manifest
    const manifest = JSON.parse(
      readFileSync(join(outputDir, "gemini-extension.json"), "utf-8")
    );
    expect(manifest.name).toBe("full-plugin");
    expect(manifest.version).toBe("2.1.0");
    expect(manifest.mcpServers).toBeDefined();
    expect(manifest.contextFileName).toBe("GEMINI.md");

    // Commands as TOML
    expect(existsSync(join(outputDir, "commands", "commit.toml"))).toBe(true);
    expect(existsSync(join(outputDir, "commands", "search.toml"))).toBe(true);

    // Skills
    expect(
      existsSync(join(outputDir, "skills", "code-review", "SKILL.md"))
    ).toBe(true);

    // Hooks
    const hooksJson = JSON.parse(
      readFileSync(join(outputDir, "hooks", "hooks.json"), "utf-8")
    );
    expect(hooksJson.hooks.BeforeTool).toBeDefined();

    // Agents
    expect(
      existsSync(join(outputDir, "agents", "code-simplifier.md"))
    ).toBe(true);

    // Context file
    expect(existsSync(join(outputDir, "GEMINI.md"))).toBe(true);

    // Metadata
    const meta = JSON.parse(
      readFileSync(join(outputDir, ".pluginx-meta.json"), "utf-8")
    );
    expect(meta.from).toBe("claude");
    expect(meta.to).toBe("gemini");

    // Report
    expect(report.pluginName).toBe("full-plugin");
    expect(report.translated.length).toBeGreaterThan(0);
    expect(report.skipped.length).toBeGreaterThan(0);
  });

  it("translates a minimal Claude plugin", async () => {
    const source = new ClaudeSourceAdapter();
    const target = new GeminiTargetAdapter();

    const ir = await source.parse(join(fixtures, "basic"));
    const report = await target.generate(ir, outputDir);

    const manifest = JSON.parse(
      readFileSync(join(outputDir, "gemini-extension.json"), "utf-8")
    );
    expect(manifest.name).toBe("basic-plugin");
    expect(report.translated.length).toBeGreaterThan(0);
    expect(report.warnings).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run test/integration/translate.test.ts`
Expected: FAIL

**Step 3: Write the target adapter**

`packages/core/src/adapters/gemini/target.ts`:
```typescript
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import type {
  TargetAdapter,
  TranslationReport,
  ComponentSummary,
  SkippedComponent,
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
    outputPath: string
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
    }

    // Agents
    if (ir.agents.length > 0) {
      const agentsDir = join(outputPath, "agents");
      await mkdir(agentsDir, { recursive: true });
      for (const agent of ir.agents) {
        await writeFile(
          join(agentsDir, `${agent.name}.md`),
          generateGeminiAgent(agent) + "\n"
        );
        translated.push({ type: "agent", name: agent.name });
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
```

`packages/core/src/adapters/gemini/index.ts`:
```typescript
export { GeminiTargetAdapter } from "./target.js";
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run test/integration/translate.test.ts`
Expected: PASS (all 2 tests)

**Step 5: Run all tests**

Run: `cd packages/core && npx vitest run`
Expected: PASS (all tests)

**Step 6: Commit**

```bash
git add packages/core/src/adapters/gemini/ packages/core/test/
git commit -m "feat: add Gemini target adapter with end-to-end integration tests"
```

---

### Task 15: CLI Entry Point and Translate Orchestrator

**Files:**
- Create: `packages/core/src/cli.ts`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/translate.ts`

**Step 1: Write the translate orchestrator**

`packages/core/src/translate.ts`:
```typescript
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
```

**Step 2: Write the CLI**

`packages/core/src/cli.ts`:
```typescript
#!/usr/bin/env node
import { Command } from "commander";
import {
  translate,
  translateMarketplace,
  createDefaultRegistry,
} from "./translate.js";
import type { TranslationReport } from "./adapters/types.js";

const program = new Command();

program
  .name("ai-plugin-translator")
  .description("Translate AI coding agent plugins between ecosystems")
  .version("0.1.0");

program
  .command("translate")
  .description("Translate a single plugin")
  .requiredOption("--to <ecosystem>", "Target ecosystem (e.g., gemini)")
  .option("--from <ecosystem>", "Source ecosystem (auto-detected if omitted)")
  .argument("<source>", "Path to source plugin")
  .argument("<output>", "Path to output directory")
  .action(
    async (
      source: string,
      output: string,
      opts: { from?: string; to: string }
    ) => {
      try {
        const report = await translate({
          from: opts.from,
          to: opts.to,
          source,
          output,
        });
        printReport(report);
        process.exitCode =
          report.skipped.length > 0 || report.warnings.length > 0 ? 2 : 0;
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    }
  );

program
  .command("translate-marketplace")
  .description("Translate all plugins in a marketplace")
  .requiredOption("--to <ecosystem>", "Target ecosystem (e.g., gemini)")
  .option("--from <ecosystem>", "Source ecosystem (auto-detected if omitted)")
  .argument("<source>", "Path to marketplace directory")
  .argument("<output-dir>", "Path to output directory")
  .action(
    async (
      source: string,
      outputDir: string,
      opts: { from?: string; to: string }
    ) => {
      try {
        const reports = await translateMarketplace({
          from: opts.from,
          to: opts.to,
          source,
          outputDir,
        });
        console.log(`Translated ${reports.length} plugins:`);
        let hasWarnings = false;
        for (const report of reports) {
          console.log(`\n  ${report.pluginName}:`);
          console.log(
            `    Translated: ${report.translated.length} components`
          );
          if (report.skipped.length > 0) {
            console.log(`    Skipped: ${report.skipped.length} components`);
            hasWarnings = true;
          }
          if (report.warnings.length > 0) {
            console.log(`    Warnings: ${report.warnings.length}`);
            hasWarnings = true;
          }
        }
        process.exitCode = hasWarnings ? 2 : 0;
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    }
  );

program
  .command("adapters")
  .description("List available source and target adapters")
  .action(() => {
    const registry = createDefaultRegistry();
    console.log("Source adapters:", registry.listSources().join(", "));
    console.log("Target adapters:", registry.listTargets().join(", "));
  });

function printReport(report: TranslationReport): void {
  console.log(
    `\nTranslated: ${report.pluginName} (${report.source} -> ${report.target})`
  );
  console.log(`\n  Components translated (${report.translated.length}):`);
  for (const t of report.translated) {
    console.log(
      `    [${t.type}] ${t.name}${t.notes ? ` (${t.notes})` : ""}`
    );
  }
  if (report.skipped.length > 0) {
    console.log(`\n  Skipped (${report.skipped.length}):`);
    for (const s of report.skipped) {
      console.log(`    [${s.type}] ${s.name}: ${s.reason}`);
    }
  }
  if (report.warnings.length > 0) {
    console.log(`\n  Warnings (${report.warnings.length}):`);
    for (const w of report.warnings) {
      console.log(`    ${w}`);
    }
  }
}

program.parse();
```

`packages/core/src/index.ts`:
```typescript
export * from "./ir/index.js";
export * from "./adapters/index.js";
export * from "./translate.js";
export { ClaudeSourceAdapter } from "./adapters/claude/index.js";
export { GeminiTargetAdapter } from "./adapters/gemini/index.js";
```

**Step 3: Build and test CLI**

Run:
```bash
cd packages/core && npx tsc
node dist/cli.js adapters
```
Expected: `Source adapters: claude` / `Target adapters: gemini`

Run:
```bash
node dist/cli.js translate --from claude --to gemini test/fixtures/claude-plugins/full /tmp/pluginx-cli-test
```
Expected: Translation report printed, exit code 2 (warnings expected)

**Step 4: Run all tests**

Run: `cd packages/core && npx vitest run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/core/src/cli.ts packages/core/src/index.ts packages/core/src/translate.ts
git commit -m "feat: add CLI with translate, translate-marketplace, and adapters commands"
```

---

### Task 16: Gemini Extension TOML Commands

**Files:**
- Create: `packages/gemini-extension/commands/pluginx/add.toml`
- Create: `packages/gemini-extension/commands/pluginx/add-marketplace.toml`
- Create: `packages/gemini-extension/commands/pluginx/update.toml`
- Create: `packages/gemini-extension/commands/pluginx/update-all.toml`
- Create: `packages/gemini-extension/commands/pluginx/status.toml`
- Create: `packages/gemini-extension/commands/pluginx/list.toml`
- Create: `packages/gemini-extension/commands/pluginx/remove.toml`
- Modify: `packages/gemini-extension/gemini-extension.json`

**Step 1: Update manifest**

Update `packages/gemini-extension/gemini-extension.json` to:
```json
{
  "name": "pluginx",
  "version": "0.1.0",
  "description": "Translate and manage Claude Code plugins as Gemini CLI extensions",
  "contextFileName": "GEMINI.md"
}
```

**Step 2: Create each TOML command file**

See the TOML command contents in the design document. Each command is a `.toml` file in `commands/pluginx/` with a `prompt = """..."""` field containing step-by-step instructions for Gemini to execute using shell injections and state management.

Key commands:
- `add.toml` - Clone repo, translate, link, update state
- `add-marketplace.toml` - Clone marketplace, translate all, link each, update state
- `update.toml` - Pull source(s), re-translate named plugins
- `update-all.toml` - Pull all sources, re-translate everything
- `status.toml` - Check if tracked plugins are outdated
- `list.toml` - Display tracked plugins from state.json
- `remove.toml` - Remove from tracking, advise manual uninstall

**Step 3: Commit**

```bash
git add packages/gemini-extension/
git commit -m "feat: add pluginx Gemini extension with TOML commands"
```

---

### Task 17: Regression Test Infrastructure

**Files:**
- Create: `.claude-plugin/marketplace.json`
- Create: `packages/core/test/regression/run.ts`
- Create: `packages/core/vitest.config.ts`

**Step 1: Create marketplace.json**

`.claude-plugin/marketplace.json`:
```json
{
  "regressionSources": [
    {
      "name": "superpowers-marketplace",
      "url": "https://github.com/anthropics/superpowers-marketplace",
      "type": "marketplace"
    },
    {
      "name": "workmux",
      "url": "https://github.com/raine/workmux",
      "type": "single",
      "notes": "Hooks coverage (UserPromptSubmit, Notification, PostToolUse, Stop)"
    },
    {
      "name": "knowledge-work-legal",
      "url": "https://github.com/anthropics/knowledge-work-plugins",
      "path": "legal",
      "type": "single",
      "notes": "Commands, skills, and MCP server coverage"
    },
    {
      "name": "laravel-simplifier",
      "url": "https://github.com/laravel/claude-code",
      "path": "laravel-simplifier",
      "type": "single",
      "notes": "Agent-only plugin, minimal structure baseline"
    }
  ]
}
```

**Step 2: Create regression test runner**

`packages/core/test/regression/run.ts` - A script that reads marketplace.json, clones each source, runs translate or translate-marketplace, and verifies output structure. Uses `execFileSync` for git operations with explicit argument arrays (no shell injection risk).

**Step 3: Create vitest config**

`packages/core/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/regression/**", "test/smoke/**"],
  },
});
```

**Step 4: Add regression script to package.json**

Add to `packages/core/package.json` scripts:
```json
"test:regression": "npx tsx test/regression/run.ts"
```

**Step 5: Commit**

```bash
git add .claude-plugin/ packages/core/test/regression/ packages/core/vitest.config.ts packages/core/package.json
git commit -m "feat: add regression test infrastructure with marketplace.json sources"
```

---

### Task 18: Smoke Test (Gemini CLI Integration)

**Files:**
- Create: `packages/core/test/smoke/gemini-link.test.ts`

**Step 1: Write the smoke test**

`packages/core/test/smoke/gemini-link.test.ts` - A script that:
1. Checks if `gemini` CLI is available on PATH (skips if not)
2. Translates the `full` fixture plugin
3. Runs `gemini extensions link` on the output
4. Runs `gemini extensions list` and verifies the extension appears
5. Cleans up with `gemini extensions uninstall`

Uses `execFileSync` with explicit argument arrays.

**Step 2: Add smoke script to package.json**

Add to `packages/core/package.json` scripts:
```json
"test:smoke": "npx tsx test/smoke/gemini-link.test.ts"
```

**Step 3: Commit**

```bash
git add packages/core/test/smoke/ packages/core/package.json
git commit -m "feat: add Gemini CLI smoke test for extension registration"
```

---

### Task 19: Final Wiring and Verification

**Files:**
- Modify: `packages/core/src/adapters/index.ts`

**Step 1: Wire up barrel exports**

`packages/core/src/adapters/index.ts`:
```typescript
export * from "./types.js";
export * from "./registry.js";
export * from "./claude/index.js";
export * from "./gemini/index.js";
```

**Step 2: Full build and test**

Run:
```bash
cd /Users/liam.helmer/repos/badal-io/ai-plugin-translator
pnpm build
pnpm test
```
Expected: Build succeeds, all unit and integration tests pass.

**Step 3: Manual CLI smoke test**

Run:
```bash
cd packages/core
node dist/cli.js translate --from claude --to gemini test/fixtures/claude-plugins/full /tmp/pluginx-final-test
ls -la /tmp/pluginx-final-test/
cat /tmp/pluginx-final-test/gemini-extension.json
cat /tmp/pluginx-final-test/.translation-report.json
```
Expected: All files present, manifest valid, report shows translated + skipped components.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: wire up barrel exports and verify full build"
```

---

## Task Summary

| Task | Component | Tests |
|------|-----------|-------|
| 1 | Project scaffolding | Build check |
| 2 | IR type definitions | Type check |
| 3 | Adapter interfaces + registry | 6 unit tests |
| 4 | Claude manifest parser | 4 unit tests |
| 5 | Claude commands parser | 7 unit tests |
| 6 | Claude skills parser | 5 unit tests |
| 7 | Claude hooks parser | 7 unit tests |
| 8 | Claude MCP + agents + context parsers | 7 unit tests |
| 9 | Claude source adapter | 8 unit tests |
| 10 | Gemini manifest generator | 5 unit tests |
| 11 | Gemini commands generator | 4 unit tests |
| 12 | Gemini hooks generator | 6 unit tests |
| 13 | Gemini skills/agents/context generators | 5 unit tests |
| 14 | Gemini target adapter + integration | 2 integration tests |
| 15 | CLI entry point | Manual + build |
| 16 | Gemini extension TOML commands | Structure |
| 17 | Regression test infrastructure | Script |
| 18 | Smoke test | Script |
| 19 | Final wiring | Full build + test |

**Total: 19 tasks, ~66 automated tests, 19 commits**
