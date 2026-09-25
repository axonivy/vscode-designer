---
name: ivy-yaml-files
description: 'MUST use for every YAML task: create, edit, update, or validate **/*.yaml. Always apply to roles.yaml, users.yaml, rest-clients.yaml, webservice-clients.yaml, persistence.yaml, databases.yaml, and custom-fields.yaml.'
user-invocable: false
---

# YAML Files

Apply these rules whenever creating or editing a YAML file in this repository:

- Axon Ivy 14 config schemas are packaged inside this skill at `schemas/14.0/config/`. Resolve that path relative to this `SKILL.md`, not the user's workspace. For example, `config/roles.yaml` uses `schemas/14.0/config/roles.json`.
- Use the local schema file, not a remote request. For an existing file, its YAML schema comment is authoritative; map the path after `/14.0/config/` to the matching file under `schemas/14.0/config/`. For a new YAML file, identify the repository's canonical schema from a template or neighboring file.
- Schema use is mandatory. Before editing, determine the applicable schema and use its definitions to guide the change. Do not run a separate post-edit schema-validation command solely because a schema is available; run additional checks when requested or when the change introduces a specific risk that warrants them.
- For an existing YAML file, inspect its `$schema` reference or YAML schema comment first. For a new YAML file, identify the repository's canonical schema from a template or neighboring file before writing content.
- If the schema content is already available in the current context, reuse it and do not download it again.
- If the matching local schema is missing, stop and report the missing cache entry. Do not search the workspace or fetch it from the network during a task.
- When creating or editing YAML, use literal spaces for indentation in the initial patch. Never emit tab characters.
- Always indent with 2 spaces, never tabs, and do not rely on a post-edit replacement or cleanup command.
