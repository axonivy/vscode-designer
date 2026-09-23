---
name: ivy-json-files
description: 'MUST use for JSON tasks: edit, update, or validate **/*.json. Always apply to Process (**/*.p.json), DataClass (**/*.d.json), Form (**/*.f.json).'
user-invocable: false
---

# JSON Files

Apply these rules whenever creating or editing a JSON file in this repository:

- Schema use is mandatory. Before editing, determine the applicable schema and use its definitions to guide and validate the change.
- For an existing JSON file, inspect its `$schema` reference or JSON schema comment first.
- If a schema's content is already available in the current context, reuse it and do not fetch it again. A `$schema` URI alone is only a pointer; it is not the schema content.
- If a schema URI is available but its content is not in the current context, call a `web` tool with that exact URI and read the returned schema before editing. Do not use an edit tool until this fetch has completed.
- After `new_axon_ivy_...` creates an initial JSON file, inspect that file and apply the same rule before any follow-up edits: fetch the schema named by its `$schema` property unless the schema content is already present in context.
- If the file does not yet exists: use `new_axon_ivy_...` tool to create a valid JSON file with the best matching schema header.
