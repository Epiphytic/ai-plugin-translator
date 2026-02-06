# AI Plugin Translator

Deterministic CLI tool that translates AI coding agent plugins between ecosystems.

**Issue:** [google-gemini/gemini-cli#17505](https://github.com/google-gemini/gemini-cli/issues/17505)

## What It Does

Converts plugins from one AI coding agent ecosystem to another using structural file transforms (no LLM). Starts with Claude Code -> Gemini CLI, architected for adding more ecosystems via adapter modules.

## Two Packages

- **`ai-plugin-translator`** - Standalone npm CLI (`npx ai-plugin-translator translate --from claude --to gemini <source> <output>`)
- **`pluginx`** - Gemini CLI extension wrapping the CLI with `/pluginx add`, `/pluginx update`, `/pluginx status`, etc.

## How It Works

```
Claude Plugin  -->  SourceAdapter.parse()  -->  Intermediate Representation  -->  TargetAdapter.generate()  -->  Gemini Extension
```

Each ecosystem is an adapter. The IR is a normalized superset of all plugin components (manifest, commands, skills, hooks, MCP servers, agents, context files). Adding a new ecosystem = writing one new adapter.

## Detailed Design

See [docs/plans/2026-02-05-plugin-translator-design.md](docs/plans/2026-02-05-plugin-translator-design.md) for:

- Full IR type definitions
- Component mapping tables (Claude <-> Gemini)
- Hook event mapping
- CLI interface and exit codes
- Gemini extension command surface (`/pluginx`)
- Project structure
- Testing strategy and regression suite
