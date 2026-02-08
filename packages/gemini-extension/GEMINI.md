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

## Consent

Some tools require security consent before first use. When a tool returns `"status": "consent_required"`, you MUST obtain consent before retrying. Do NOT use shell commands.

Present the security notice to the user and ask them to choose one of the following:

1. **Acknowledged** — Accept the risks for this session only
2. **Bypass** — Accept and skip future consent prompts
3. **Declined** — Refuse to proceed

After the user responds, call `pluginx_consent` with the chosen level, then retry the original command. If declined, do NOT retry.

## Usage Examples

- "Add the pr-review-toolkit plugin" -> `pluginx_add` with source `obra/pr-review-toolkit`
- "Install all plugins from superpowers marketplace" -> `pluginx_add_marketplace` with source `obra/superpowers-marketplace`
- "What plugins do I have?" -> `pluginx_list`
- "Are my plugins up to date?" -> `pluginx_status`
- "Update the pr-review-toolkit plugin" -> `pluginx_update` with names `["pr-review-toolkit"]`
- "Update all my plugins" -> `pluginx_update_all`
- "Remove pr-review-toolkit" -> `pluginx_remove` with name `pr-review-toolkit`
