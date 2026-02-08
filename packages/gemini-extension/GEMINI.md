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

Some tools require security consent before first use. When a tool returns `"status": "consent_required"`, you MUST obtain consent before retrying.

**IMPORTANT:** You MUST use the `ask_user` tool to present the consent dialog. Do NOT present the options as plain text, numbered lists, or shell commands.

Use the `ask_user` tool with these exact parameters:
- **header:** "Consent"
- **question:** "pluginx is an EXPERIMENTAL tool that translates Claude Code plugins into Gemini CLI extensions. By using pluginx, you are installing code from third-party plugin developers into your Gemini CLI environment. These plugins may contain arbitrary shell commands in hooks, MCP servers, and command prompts. ONLY install plugins from developers that you trust.\n\nHow would you like to proceed?"
- **type:** "choice"
- **multiSelect:** `false`
- **options:**
    - Label: "Acknowledged", Description: "Accept the risks for this session only"
    - Label: "Bypass", Description: "Accept and skip future consent prompts"
    - Label: "Declined", Description: "Refuse to proceed"

After the user responds:
- If "Acknowledged": call `pluginx_consent` with level "acknowledged", then retry the original command.
- If "Bypass": call `pluginx_consent` with level "bypass", then retry the original command.
- If "Declined": inform the user that the operation was cancelled. Do NOT retry.

## Usage Examples

- "Add the pr-review-toolkit plugin" -> `pluginx_add` with source `obra/pr-review-toolkit`
- "Install all plugins from superpowers marketplace" -> `pluginx_add_marketplace` with source `obra/superpowers-marketplace`
- "What plugins do I have?" -> `pluginx_list`
- "Are my plugins up to date?" -> `pluginx_status`
- "Update the pr-review-toolkit plugin" -> `pluginx_update` with names `["pr-review-toolkit"]`
- "Update all my plugins" -> `pluginx_update_all`
- "Remove pr-review-toolkit" -> `pluginx_remove` with name `pr-review-toolkit`
