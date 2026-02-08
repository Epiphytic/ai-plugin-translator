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

When a tool returns `{"status": "consent_required", "securityNotice": "..."}`, you MUST handle consent entirely through the `ask_user` tool. Do NOT use shell commands, `echo`, or any other external commands to display the notice.

Call the built-in `ask_user` tool with the `securityNotice` text embedded directly in the `question` field:

```json
{
  "questions": [
    {
      "question": "<securityNotice text here>\n\nHow would you like to proceed?",
      "header": "Consent",
      "type": "choice",
      "options": [
        {
          "label": "Acknowledged",
          "description": "Accept the risks for this session only"
        },
        {
          "label": "Bypass",
          "description": "Accept and skip future consent prompts"
        },
        {
          "label": "Declined",
          "description": "Refuse to proceed"
        }
      ]
    }
  ]
}
```

Replace `<securityNotice text here>` with the actual `securityNotice` value from the tool response.

Based on the user's choice:
- **Acknowledged**: Call `pluginx_consent` with `level: "acknowledged"`, then retry the original command
- **Bypass**: Call `pluginx_consent` with `level: "bypass"`, then retry the original command
- **Declined**: Inform the user that the operation was cancelled. Do NOT retry.

## Usage Examples

- "Add the pr-review-toolkit plugin" -> `pluginx_add` with source `obra/pr-review-toolkit`
- "Install all plugins from superpowers marketplace" -> `pluginx_add_marketplace` with source `obra/superpowers-marketplace`
- "What plugins do I have?" -> `pluginx_list`
- "Are my plugins up to date?" -> `pluginx_status`
- "Update the pr-review-toolkit plugin" -> `pluginx_update` with names `["pr-review-toolkit"]`
- "Update all my plugins" -> `pluginx_update_all`
- "Remove pr-review-toolkit" -> `pluginx_remove` with name `pr-review-toolkit`
