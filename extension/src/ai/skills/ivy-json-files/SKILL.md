---
name: ivy-json-files
description: 'MUST use for JSON tasks: edit, update, or validate **/*.json. Always apply to Process (**/*.p.json), DataClass (**/*.d.json), Form (**/*.f.json).'
user-invocable: false
---

# JSON Files

Apply these rules whenever creating or editing a JSON file in this repository:

- Axon Ivy 14 project schemas are packaged inside this skill at `schemas/14.0/project/`. Resolve that path relative to this `SKILL.md`, not the user's workspace. Use `schemas/14.0/project/process.json` for `*.p.json`, `schemas/14.0/project/data-class.json` for `*.d.json`, and `schemas/14.0/project/form.json` for `*.f.json`.
- Use the local schema, not a remote request. For an existing JSON file, inspect its `$schema` property or schema comment and map the URI path after `/14.0/project/` to the matching file under `schemas/14.0/project/`.
- Before editing, read the complete existing JSON file in one operation and read the complete matching local schema in one operation. Reuse both from context; do not issue ranged rereads or search within the schema unless a tool explicitly reports truncation or a referenced schema is needed. A `$schema` URI identifies the schema but is not a substitute for reading its contents.
- Schema use is mandatory: treat the matching schema as the authoring contract and use its definitions to guide the change. Do not run separate post-edit schema validation solely because a schema is available; run additional checks when requested or when a specific risk warrants them.
- Treat the matching schema as the authoring contract and implement the requested change against it. Ensure JSON syntax while composing the edit, including escaping quotes inside string values. Do not run post-edit schema, structure, or behavior checks by default, and do not retry with alternative validators; check only when the user explicitly requests verification or a concrete tool-reported problem needs diagnosis.
- If the matching local schema is missing, stop and report the missing cache entry. Do not search the workspace or fetch it from the network during a task.
- After `new_axon_ivy_...` creates an initial JSON file, inspect its `$schema` property to confirm it matches the selected local schema. Reuse schema content already read; if it has not yet been read, read the complete schema once before follow-up edits.
- If the file does not yet exists: use `new_axon_ivy_...` tool to create a valid JSON file with the best matching schema header.
