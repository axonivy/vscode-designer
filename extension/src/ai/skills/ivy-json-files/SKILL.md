---
name: ivy-json-files
description: 'MUST use for JSON tasks: edit, update, or validate **/*.json. Always apply to Process (**/*.p.json), DataClass (**/*.d.json), Form (**/*.f.json).'
user-invocable: false
---

# JSON Files

Apply these rules whenever creating or editing a JSON file in this repository:

- Use the bundled Axon Ivy 14 schemas at `schemas/14.0/project/`, relative to this skill: `*.p.json` → `process.json`, `*.d.json` → `data-class.json`, `*.f.json` → `form.json`.
- Select the schema from the file's `$schema` or schema comment; map the URI path after `/14.0/project/` to the bundled file. Never search the workspace or fetch remotely. If the local schema is missing, stop and report it.
- Before editing, read the complete target JSON and matching schema once. Retain their full contents; reread or search only if a tool reports truncation or a schema reference requires another schema.
- Treat the schema as authoritative: follow all required fields, types, and constraints; do not omit schema requirements or invent structure.
- No routine post-edit validation is required. Check only when the user asks or a concrete tool-reported problem needs diagnosis.
- For a new file, use `new_axon_ivy_...`; inspect its `$schema` and apply the same local-schema rule before follow-up edits.
