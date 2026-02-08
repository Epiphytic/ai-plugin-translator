# pluginx - Claude Code Plugin Translator

pluginx translates Claude Code plugins into Gemini CLI extensions and manages their lifecycle.

## Available Tools

| Tool | Purpose |
|------|---------|
| `pluginx_add` | Add a single Claude Code plugin (translate + link) |
| `pluginx_add_marketplace` | Add all plugins from a Claude Code marketplace repo |
| `pluginx_list` | List tracked plugins |
| `pluginx_status` | Check if plugins are up to date with their sources |
| `pluginx_update` | Update specific plugins (pull + re-translate + re-link) |
| `pluginx_update_all` | Update all tracked plugins |
| `pluginx_remove` | Remove a plugin from tracking |
| `pluginx_consent` | Set the user's security consent level |

## Consent Flow Protocol

**IMPORTANT**: Some tools (`pluginx_add`, `pluginx_add_marketplace`, `pluginx_update`, `pluginx_update_all`) require security consent before proceeding.

When a tool returns `{"status": "consent_required", "securityNotice": "..."}`:

1. Present the `securityNotice` text to the user
2. Use `ask_user` to ask the user to choose one of:
   - **"acknowledged"** (recommended) - Accept the risks for this session
   - **"bypass"** - Accept and skip future consent prompts
   - **"declined"** - Refuse to proceed
3. Call `pluginx_consent` with the user's choice as the `level` parameter
4. If the user chose "acknowledged" or "bypass", retry the original command
5. If the user chose "declined", inform them that the operation was cancelled

## Usage Examples

- "Add the pr-review-toolkit plugin" -> `pluginx_add` with source `obra/pr-review-toolkit`
- "Install all plugins from superpowers marketplace" -> `pluginx_add_marketplace` with source `obra/superpowers-marketplace`
- "What plugins do I have?" -> `pluginx_list`
- "Are my plugins up to date?" -> `pluginx_status`
- "Update the pr-review-toolkit plugin" -> `pluginx_update` with names `["pr-review-toolkit"]`
- "Update all my plugins" -> `pluginx_update_all`
- "Remove pr-review-toolkit" -> `pluginx_remove` with name `pr-review-toolkit`
