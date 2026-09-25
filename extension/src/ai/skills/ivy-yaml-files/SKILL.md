---
name: ivy-yaml-files
description: 'MUST use for every YAML task: create, edit, update, or validate **/*.yaml. Always apply to roles.yaml, users.yaml, rest-clients.yaml, webservice-clients.yaml, persistence.yaml, databases.yaml, and custom-fields.yaml.'
user-invocable: false
---

# YAML Files

Apply these rules whenever creating or editing a YAML file in this repository:

- Axon Ivy 14 schemas are cached locally in `../schemas/14.0/`, mirroring their paths under `https://json-schema.axonivy.com/14.0/`. Use the local schema file, not a remote request.
- For an existing file, its YAML schema comment is authoritative; map the path after `/14.0/` to the matching local cache path. For a new YAML file, identify the repository's canonical schema from a template or neighboring file.
- Schema use is mandatory. Before editing, determine the applicable schema and use its definitions to guide and validate the change.
- For an existing YAML file, inspect its `$schema` reference or YAML schema comment first. For a new YAML file, identify the repository's canonical schema from a template or neighboring file before writing content.
- If the schema content is already available in the current context, reuse it and do not download it again.
- If the matching local schema is missing, stop and report the missing cache entry. Do not fetch it from the network during a task.
- When creating or editing YAML, use literal spaces for indentation in the initial patch. Never emit tab characters.
- Always indent with 2 spaces, never tabs, and do not rely on a post-edit replacement or cleanup command.
