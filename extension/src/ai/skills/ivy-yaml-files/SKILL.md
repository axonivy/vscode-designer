---
name: ivy-yaml-files
description: 'Use when creating or editing any YAML file in this repository: including **/*.yaml. Especially enforce this for roles.yaml, users.yaml, rest-clients.yaml, webservice-clients.yaml, persistence.yaml, databases.yaml, custom-fields.yaml'
user-invocable: false
---

# YAML Files

Apply these rules whenever creating or editing a YAML file in this repository:

- Schema use is mandatory. Before editing, determine the applicable schema and use its definitions to guide and validate the change.
- For an existing YAML file, inspect its `$schema` reference or YAML schema comment first. For a new YAML file, identify the repository's canonical schema from a template or neighboring file before writing content.
- If the schema content is already available in the current context, reuse it and do not download it again.
- If a schema URI is available but its content is not in the current context, call a `web` tool for that URI before editing. A URI alone does not count as using the schema.
- When creating or editing YAML, use literal spaces for indentation in the initial patch. Never emit tab characters.
- Always indent with 2 spaces, never tabs, and do not rely on a post-edit replacement or cleanup command.
