# AI Plugin Translator

Translate Claude Code plugins into Gemini CLI extensions. No LLM required -- all transforms are deterministic, structural file conversions.

## Quick Start (Gemini CLI Extension)

The fastest way to use this project is as a **Gemini CLI extension**. Once installed, Gemini can manage Claude Code plugins for you directly from the chat.

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) installed and on your PATH

### Install the extension

```bash
# Clone this repo
git clone https://github.com/badal-io/ai-plugin-translator.git
cd ai-plugin-translator

# Install dependencies and build
npm install -g pnpm   # if you don't have pnpm
pnpm install
pnpm build

# Link the extension into Gemini CLI
gemini extensions link packages/gemini-extension
```

### Use it in Gemini CLI

After linking, Gemini has access to `pluginx` tools. Just ask it in natural language:

```
> Add the superpowers plugin from obra/superpowers
> Install all plugins from the superpowers marketplace (obra/superpowers-marketplace)
> What plugins do I have installed?
> Are my plugins up to date?
> Update all my plugins
> Remove the superpowers plugin
```

Behind the scenes, Gemini calls MCP tools like `pluginx_add`, `pluginx_list`, `pluginx_update_all`, etc.

### Available tools

| Tool | What it does |
|------|-------------|
| `pluginx_add` | Add a single Claude Code plugin (clone, translate, link) |
| `pluginx_add_marketplace` | Add all plugins from a Claude Code marketplace repo |
| `pluginx_list` | List all tracked plugins |
| `pluginx_status` | Check if plugins are up to date with their sources |
| `pluginx_update` | Update specific plugins by name |
| `pluginx_update_all` | Update all tracked plugins |
| `pluginx_remove` | Remove a tracked plugin |

### Security consent

The first time you use a pluginx tool, you'll be asked to acknowledge a security notice. Claude Code plugins can contain arbitrary shell commands in hooks and MCP servers -- only install plugins from developers you trust.

## Standalone CLI

You can also use the translation engine directly from the command line without Gemini CLI.

### Install

```bash
npm install -g @epiphytic/ai-plugin-translator
```

Or run without installing:

```bash
npx @epiphytic/ai-plugin-translator translate --to gemini <source-path> <output-path>
```

### Translate a single plugin

```bash
ai-plugin-translator translate --to gemini ./my-claude-plugin ./output
```

### Translate a marketplace (multiple plugins)

```bash
ai-plugin-translator translate-marketplace --to gemini ./marketplace-repo ./output-dir
```

### Plugin manager CLI

The `pluginx` CLI wraps translation with Gemini CLI linking:

```bash
# Add a plugin from GitHub
pluginx add obra/superpowers

# Add all plugins from a marketplace
pluginx add-marketplace obra/superpowers-marketplace

# List installed plugins
pluginx list

# Check for updates
pluginx status

# Update all plugins
pluginx update-all

# Remove a plugin
pluginx remove superpowers
```

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error |
| 2 | Translated with warnings (some components skipped or approximated) |

## What gets translated

The translator converts these Claude Code plugin components into their Gemini CLI equivalents:

| Component | Claude Code | Gemini CLI |
|-----------|------------|------------|
| Manifest | `package.json` | `gemini-extension.json` |
| Slash commands | `commands/*.md` | `commands/**/*.md` |
| Skills | `skills/**/*.md` | `commands/**/*.md` |
| Agents | `.claude/agents/*.md` | `agents/*.md` |
| Hooks | `.claude/settings.json` | `hooks.toml` |
| MCP servers | `.claude/settings.json` | `gemini-extension.json` mcpServers |
| Context files | `CLAUDE.md` | `GEMINI.md` |
| Passthrough files | Static assets, scripts | Copied as-is |

### Notable mappings

- **Hook timeouts**: Claude uses seconds, Gemini uses milliseconds
- **Path variables**: `${CLAUDE_PLUGIN_ROOT}` becomes `${extensionPath}`
- **Argument placeholders**: `$ARGUMENTS` becomes `{{args}}`
- **Shell injections**: `` !`command` `` becomes `!{command}`
- **Hook events**: `PreToolUse` / `PostToolUse` / `Stop` map to `BeforeTool` / `AfterTool` / `AfterAgent`

Components that don't have a Gemini equivalent (e.g., `.lsp.json`, `SubagentStop` hooks) are reported as skipped in the translation report -- never silently dropped.

## How it works

```
Claude Plugin  -->  SourceAdapter.parse()  -->  Intermediate Representation  -->  TargetAdapter.generate()  -->  Gemini Extension
```

The Intermediate Representation (IR) is a normalized superset of all plugin components. Each ecosystem is an adapter module. Adding support for a new ecosystem means writing one new adapter.

## Project structure

```
packages/
  core/                          # Translation engine + CLI
    src/
      ir/types.ts                # PluginIR type definitions
      adapters/claude/source.ts  # Claude -> IR parser
      adapters/gemini/target.ts  # IR -> Gemini generator
      cli.ts                     # ai-plugin-translator CLI
      pluginx.ts                 # pluginx CLI
      pluginx/commands/          # Command implementations
    test/
      unit/                      # Unit tests
      integration/               # Integration tests
      fixtures/                  # Test fixtures

  gemini-extension/              # Gemini CLI MCP server extension
    src/server.ts                # MCP server entry point
    src/tools/                   # Tool handlers
    gemini-extension.json        # Extension manifest
    GEMINI.md                    # Model instructions
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests (196 tests across 32 files)
pnpm test

# Run specific test suites
pnpm test:unit        # Unit tests only
pnpm test:int         # Integration tests only

# Lint
pnpm lint
```

### Regression tests

Regression tests clone real-world plugins and validate the translation output:

```bash
pnpm test:regression                # All regression tests
pnpm test:regression:superpowers    # superpowers-marketplace specifically
```

## License

MIT
