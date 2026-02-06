# AI Plugin Translator - Design Document

**Date:** 2026-02-05
**Status:** Draft
**Issue:** [google-gemini/gemini-cli#17505](https://github.com/google-gemini/gemini-cli/issues/17505)

## Overview

A deterministic CLI tool that translates AI coding agent plugins between ecosystems, starting with Claude Code -> Gemini CLI. Packaged as both a standalone npm CLI and a Gemini CLI extension (`pluginx`).

No LLM is used in the translation process. All conversions are structural file transforms.

## Architecture

Two packages in one monorepo:

1. **`ai-plugin-translator`** (npm package / CLI) - The core translation engine. Reads plugins from one ecosystem format, normalizes to an intermediate representation (IR), and writes out in another ecosystem's format.
2. **`pluginx`** (Gemini CLI extension) - Thin wrapper that calls the CLI, manages tracking state, and registers translated extensions with Gemini.

### Multi-Ecosystem Design

Each ecosystem is represented by an adapter module implementing one or both of:

- `SourceAdapter` - Reads an ecosystem's plugin format into the IR
- `TargetAdapter` - Writes the IR out as a target ecosystem's plugin format

Adding a new ecosystem means writing one new adapter. The IR is the bridge.

CLI flags `--from <ecosystem>` and `--to <ecosystem>` select adapters explicitly. Auto-detection is available when `--from` is omitted.

## Intermediate Representation (IR)

The IR is a TypeScript type hierarchy representing the normalized superset of all plugin components across ecosystems.

```typescript
interface PluginIR {
  manifest: ManifestIR
  commands: CommandIR[]
  skills: SkillIR[]
  hooks: HookIR[]
  mcpServers: McpServerIR[]
  contextFiles: ContextFileIR[]
  agents: AgentIR[]
  unsupported: UnsupportedComponent[]
}

interface ManifestIR {
  name: string
  version: string
  description: string
  author?: { name: string; email?: string; url?: string }
  homepage?: string
  repository?: string
  keywords?: string[]
  settings?: SettingIR[]
}

interface CommandIR {
  name: string
  group?: string
  description: string
  prompt: string
  arguments?: string           // Normalized to {{args}}
  shellInjections: ShellInjection[]  // Normalized to !{command}
  allowedTools?: string[]      // Claude-specific, skipped where unsupported
  disableModelInvocation?: boolean
}

interface SkillIR {
  name: string
  description: string
  version?: string
  content: string              // The skill prompt body
  frontmatter: Record<string, unknown>
}

interface HookIR {
  event: string                // Canonical event name
  matcher?: string
  command: string
  timeout: number              // Milliseconds (normalized)
  sourceEvent: string          // Original event name for reporting
}

interface McpServerIR {
  name: string
  type: "stdio" | "http"
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  url?: string
  headers?: Record<string, string>
}

interface ContextFileIR {
  filename: string
  content: string
}

interface AgentIR {
  name: string
  content: string
  frontmatter: Record<string, unknown>
}

interface UnsupportedComponent {
  type: string
  name: string
  reason: string
  sourceEcosystem: string
}
```

## Adapter Interfaces

```typescript
interface SourceAdapter {
  name: string
  detect(path: string): Promise<boolean>
  parse(path: string): Promise<PluginIR>
}

interface TargetAdapter {
  name: string
  generate(ir: PluginIR, outputPath: string): Promise<TranslationReport>
}

interface TranslationReport {
  source: string
  target: string
  pluginName: string
  translated: ComponentSummary[]
  skipped: SkippedComponent[]
  warnings: string[]
}

interface ComponentSummary {
  type: string     // "command", "skill", "hook", etc.
  name: string
  notes?: string   // e.g., "approximate mapping"
}

interface SkippedComponent {
  type: string
  name: string
  reason: string
}
```

The `detect` method on `SourceAdapter` enables auto-detection: checks for `.claude-plugin/plugin.json` (Claude) or `gemini-extension.json` (Gemini) at the given path.

## Component Mapping: Claude -> Gemini

### Manifest

| Claude (`plugin.json`) | Gemini (`gemini-extension.json`) | Notes |
|---|---|---|
| `name` | `name` | Direct |
| `version` | `version` | Direct |
| `description` | `description` | Direct |
| `author`, `homepage`, `keywords` | -- | Skipped (no Gemini equivalent) |
| -- | `settings` | Gemini-only, not generated from Claude |
| -- | `contextFileName` | Set to `GEMINI.md` if CLAUDE.md exists |

### Commands

| Claude (Markdown + YAML frontmatter) | Gemini (TOML) | Notes |
|---|---|---|
| `$ARGUMENTS` | `{{args}}` | String replace |
| `` !`command` `` | `!{command}` | String replace |
| `description` frontmatter | Part of TOML | Direct |
| `allowed-tools` frontmatter | -- | Skipped with warning |
| `disable-model-invocation` | -- | Skipped with warning |

### Skills

Skills are mostly passthrough. Both ecosystems use `skills/<name>/SKILL.md` with frontmatter. Frontmatter key names may differ slightly and are remapped.

### Hooks

| Canonical IR Event | Claude Event | Gemini Event | Notes |
|---|---|---|---|
| `PreToolUse` | `PreToolUse` | `BeforeTool` | Direct |
| `PostToolUse` | `PostToolUse` | `AfterTool` | Direct |
| `SessionStart` | `SessionStart` | `SessionStart` | Direct |
| `SessionEnd` | `SessionEnd` | `SessionEnd` | Direct |
| `PreCompact` | `PreCompact` | `PreCompress` | Name diff only |
| `Notification` | `Notification` | `Notification` | Direct |
| `UserPromptSubmit` | `UserPromptSubmit` | `BeforeAgent` | Approximate |
| `Stop` | `Stop` | `AfterAgent` | Approximate |
| `SubagentStop` | `SubagentStop` | -- | Skipped |
| -- | -- | `BeforeModel` | Gemini-only |
| -- | -- | `AfterModel` | Gemini-only |
| -- | -- | `BeforeToolSelection` | Gemini-only |

Timeouts are normalized: Claude uses seconds, Gemini uses milliseconds.

Path variables: `${CLAUDE_PLUGIN_ROOT}` -> `${extensionPath}`.

### MCP Servers

Claude stores MCP config in `.mcp.json` at plugin root. Gemini embeds it in `mcpServers` inside `gemini-extension.json`. The structure is similar - both support `command`/`args`/`env`/`cwd` for stdio and URL-based for HTTP.

### Context Files

`CLAUDE.md` is translated to `GEMINI.md` (or whatever `contextFileName` is set to). Content is copied as-is.

### Agents

Both ecosystems support agent definition files in `agents/` with markdown + frontmatter. Frontmatter keys may need remapping.

### Unsupported Components

| Component | Reason |
|---|---|
| `.lsp.json` | No Gemini equivalent |
| `allowed-tools` in commands | No Gemini TOML equivalent |
| `SubagentStop` hooks | No Gemini equivalent event |
| `disable-model-invocation` | No Gemini equivalent |

All skipped components appear in the translation report.

## CLI Interface

```
ai-plugin-translator translate --from claude --to gemini <source> <output>
ai-plugin-translator translate-marketplace --from claude --to gemini <source> <output-dir>
ai-plugin-translator status <source> <output>
ai-plugin-translator adapters
```

### Exit Codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Error (invalid input, adapter not found, etc.) |
| 2 | Translated with warnings (partial translation) |

### Translation Metadata

Each translated extension includes `.pluginx-meta.json`:

```json
{
  "sourceUrl": "https://github.com/user/plugin",
  "sourceRef": "abc1234",
  "sourceHash": "sha256:...",
  "translatedAt": "2026-02-05T...",
  "translatorVersion": "1.0.0",
  "from": "claude",
  "to": "gemini"
}
```

## Gemini Extension (`pluginx`)

### Commands

| Command | Description |
|---|---|
| `/pluginx add <url>` | Clone, translate single plugin, link, track |
| `/pluginx add-marketplace <url>` | Clone, translate all plugins in marketplace, link each, track |
| `/pluginx update <name...>` | Pull source, re-translate one or more plugins |
| `/pluginx update-all` | Re-translate all tracked plugins |
| `/pluginx status` | Show tracked plugins with outdated/up-to-date state |
| `/pluginx list` | Show all tracked plugins and source URLs |
| `/pluginx remove <name>` | Stop tracking (advises `gemini extensions uninstall`) |

### Tracking State

Stored at `~/.gemini/extensions/pluginx/state.json`:

```json
{
  "plugins": {
    "superpowers-marketplace": {
      "sourceUrl": "https://github.com/anthropics/superpowers-marketplace",
      "type": "marketplace",
      "from": "claude",
      "children": ["superpowers-core", "superpowers-chrome"]
    },
    "greptile": {
      "sourceUrl": "https://github.com/greptile-inc/claude-plugin",
      "type": "single",
      "from": "claude"
    }
  },
  "outputDir": "~/.gemini/extensions/pluginx-translations"
}
```

### Output Location

Translated extensions are output to `~/.gemini/extensions/pluginx-translations/<name>/` and registered via `gemini extensions link`.

## Project Structure

```
ai-plugin-translator/
  packages/
    core/                              # npm: ai-plugin-translator
      src/
        ir/
          types.ts                     # PluginIR, CommandIR, etc.
        adapters/
          claude/
            source.ts                  # ClaudeSourceAdapter
            parsers/
              manifest.ts
              commands.ts
              skills.ts
              hooks.ts
              mcp.ts
              agents.ts
              context.ts
          gemini/
            target.ts                  # GeminiTargetAdapter
            generators/
              manifest.ts
              commands.ts
              skills.ts
              hooks.ts
              mcp.ts
              agents.ts
              context.ts
        registry.ts                    # Adapter registration/discovery
        cli.ts                         # CLI entry point
        report.ts                      # TranslationReport generation
      test/
        unit/
          adapters/
            claude/                    # Per-parser tests
            gemini/                    # Per-generator tests
        integration/
          translate.test.ts            # End-to-end single plugin
          marketplace.test.ts          # End-to-end marketplace
        smoke/
          gemini-link.test.ts          # Verify extensions register in Gemini
        fixtures/
          claude-plugins/              # Synthetic test fixtures
          expected-gemini-extensions/  # Snapshot expectations
      package.json
      tsconfig.json
    gemini-extension/                  # The pluginx Gemini extension
      gemini-extension.json
      commands/
        pluginx/
          add.toml
          add-marketplace.toml
          update.toml
          update-all.toml
          status.toml
          list.toml
          remove.toml
  .claude-plugin/
    marketplace.json                   # Regression test plugin sources
  package.json                         # Workspace root (pnpm)
  DESIGN.md                            # Links here
```

## Testing Strategy

### Unit Tests

Each parser in `adapters/claude/parsers/` and each generator in `adapters/gemini/generators/` is tested independently. Feed in a file, assert the IR or output structure.

### Snapshot Tests

Synthetic Claude plugin fixtures in `test/fixtures/claude-plugins/` with expected Gemini output in `test/fixtures/expected-gemini-extensions/`. End-to-end `translate` call, diff against snapshots.

### Integration Smoke Tests

After translating and linking a plugin, verify against a live `gemini` CLI:
- `gemini extensions list` shows the translated extension
- Commands and skills are registered and visible

These tests require a working `gemini` CLI installation.

### Regression Test Suite

Real public plugins used as fixtures, defined in `.claude-plugin/marketplace.json`:

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

**Coverage across regression sources:**

| Component | superpowers | workmux | legal | laravel-simplifier |
|---|---|---|---|---|
| Manifest | Y | Y | Y | Y |
| Commands | Y | - | Y (5) | - |
| Skills | Y | Y | Y (6) | - |
| Hooks | Y | Y (4 types) | - | - |
| MCP | Y | - | Y | - |
| Agents | Y | - | - | Y |

CI runs: clone each source -> translate -> snapshot compare -> smoke test (if gemini available).

### Non-Goals (v1)

- No LLM-based translation
- No Gemini -> Claude direction (architecture supports it, not built)
- No automatic GitHub repo creation or pushing
- No translation of MCP server source code (only config references)
- No `.lsp.json` translation
- No deep runtime behavior validation (smoke tests verify registration only)

## Open Questions

- Exact superpowers-marketplace repo structure needs verification at implementation time
- Gemini skill frontmatter key differences need to be mapped during implementation
- Agent frontmatter differences between ecosystems need investigation
