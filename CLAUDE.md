# AI Plugin Translator

Deterministic CLI tool that translates AI coding agent plugins between ecosystems (no LLM). Currently supports Claude Code -> Gemini CLI.

## Architecture

Monorepo with two packages (pnpm workspaces):

- **`packages/core`** (`ai-plugin-translator`) - Translation engine with adapter pattern: `SourceAdapter.parse()` -> IR -> `TargetAdapter.generate()`
- **`packages/gemini-extension`** (`pluginx`) - Gemini CLI extension wrapping the core CLI

Each ecosystem is an adapter module. The IR (`PluginIR`) is a normalized superset of all plugin components. Adding a new ecosystem = one new adapter.

## Key Conventions

- TypeScript strict mode
- Tests use vitest
- TDD: write tests before implementation
- Each parser/generator is independently testable
- Snapshot tests compare translated output against expected fixtures in `test/fixtures/`

## Build & Test

```bash
pnpm install
pnpm build          # Build all packages
pnpm test           # Run all tests
pnpm test:unit      # Unit tests only
pnpm test:int       # Integration tests only
```

## Project Structure

```
packages/
  core/src/
    ir/types.ts              # PluginIR, CommandIR, etc.
    adapters/claude/source.ts # ClaudeSourceAdapter + parsers/
    adapters/gemini/target.ts # GeminiTargetAdapter + generators/
    registry.ts               # Adapter registration
    cli.ts                    # CLI entry point
    report.ts                 # TranslationReport generation
  gemini-extension/            # pluginx Gemini extension
```

## Design References

- [DESIGN.md](DESIGN.md) - Overview
- [docs/plans/2026-02-05-plugin-translator-design.md](docs/plans/2026-02-05-plugin-translator-design.md) - Full design with IR types, mapping tables, CLI interface
- [docs/plans/2026-02-05-implementation-plan.md](docs/plans/2026-02-05-implementation-plan.md) - TDD implementation plan

## Important Patterns

- Adapters implement `SourceAdapter` (parse) and/or `TargetAdapter` (generate) interfaces
- Hook timeouts: Claude uses seconds, Gemini uses milliseconds - always normalize
- Path variables: `${CLAUDE_PLUGIN_ROOT}` maps to `${extensionPath}`
- Argument placeholders: `$ARGUMENTS` maps to `{{args}}`
- Shell injections: `` !`command` `` maps to `!{command}`
- Unsupported components (e.g., `.lsp.json`, `SubagentStop` hooks) must appear in the TranslationReport, never silently dropped
- Exit codes: 0 = success, 1 = error, 2 = translated with warnings
