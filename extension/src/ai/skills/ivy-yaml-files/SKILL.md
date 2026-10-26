---
name: ivy-yaml-files
description: 'MUST use for every YAML task: create, edit, update, or validate **/*.yaml. Always apply to roles.yaml, users.yaml, rest-clients.yaml, webservice-clients.yaml, persistence.yaml, databases.yaml, and custom-fields.yaml.'
user-invocable: false
---

# YAML Files

Apply these rules whenever creating or editing a YAML file in this repository:

- Axon Ivy config schemas are packaged inside this skill at `schemas/config/`. Resolve that path relative to this `SKILL.md`, not the user's workspace. For example, `config/roles.yaml` uses `schemas/config/roles.json`.
- Use the local schema file, not a remote request. For an existing file, its YAML schema comment is authoritative; use the schema filename to find the matching file under `schemas/config/` (for example, `app/custom-fields.json` maps to `schemas/config/custom-fields.json`). For a new YAML file, identify the repository's canonical schema from a template or neighboring file.
- Schema use is mandatory. Before editing, determine the applicable schema and use its definitions to guide the change. Do not run a separate post-edit schema-validation command solely because a schema is available; run additional checks when requested or when the change introduces a specific risk that warrants them.
- For an existing YAML file, inspect its `$schema` reference or YAML schema comment first. For a new YAML file, identify the repository's canonical schema from a template or neighboring file before writing content.
- Schema descriptions are complete. Do not search the workspace for example files unless the user asks or a schema description directs you to.
- If the matching local schema is missing, stop and report the missing cache entry. Do not search the workspace or fetch it from the network during a task.
- Always indent with 2 spaces, never tabs.

## Known issues

- VS Code Copilot Chat only: `apply_patch` writes indentation as tabs on a file with no uncommented indented lines yet, and still reports success. After that patch, read the file again and replace each leading tab with 2 spaces; don't read it again after that fix. Skip this for files that already had lines indented with spaces.
- Don't run error checks, YAML parsers, or schema validation after editing unless asked.
