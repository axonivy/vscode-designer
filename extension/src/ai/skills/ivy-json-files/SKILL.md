---
name: ivy-json-files
description: 'MUST use for JSON tasks: edit, update, or validate **/*.json. Always apply to Process (**/*.p.json), DataClass (**/*.d.json), Form (**/*.f.json).'
user-invocable: false
---

# JSON Files

Apply these rules whenever creating or editing a JSON file in this repository:

- Axon Ivy 14 schemas are cached locally in `../schemas/14.0/`, mirroring their paths under `https://json-schema.axonivy.com/14.0/`. Process (`*.p.json`), DataClass (`*.d.json`), and Form (`*.f.json`) files use `project/process.json`, `project/data-class.json`, and `project/form.json` respectively.
- Use the local schema file, not a remote request. For an existing file, its `$schema` value is authoritative; map the path after `/14.0/` to the matching local cache path.
- Schema use is mandatory. Before editing, determine the applicable schema and use its definitions to guide and validate the change.
- For an existing JSON file, inspect its `$schema` reference or JSON schema comment first.
- If a schema's content is already available in the current context, reuse it and do not fetch it again. A `$schema` URI alone is only a pointer; it is not the schema content.
- If the matching local schema is missing, stop and report the missing cache entry. Do not fetch it from the network during a task.
- After `new_axon_ivy_...` creates an initial JSON file, inspect its `$schema` property and read the matching local schema before any follow-up edits.
- If the file does not yet exists: use `new_axon_ivy_...` tool to create a valid JSON file with the best matching schema header.
