# Axon Ivy Skills

The vscode-designer extension comes pre-configured with [skills](../../extension/src/ai/skills/),
and [tools](../mcp/mcp.md), that make AI Agents more effective and correct when working with ivy projects.

## Custom harness

The skill files are designed to work with any third-party harness like Claude or Copilot CLI.
You need to copy the skills, however, into your tooling environment.

To install skills to copilot CLI, we encourage to use Github's `gh` binary.
With it you can install our skills as follows:
`gh skill install axonivy/vscode-designer`
 to install the skills