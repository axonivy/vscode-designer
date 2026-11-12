---
name: ivy-json-files
description: 'MUST use for JSON tasks: edit, update, or validate **/*.json. Always apply to Process (**/*.p.json), DataClass (**/*.d.json), Form (**/*.f.json).'
user-invocable: false
---

# JSON Files

Apply these rules whenever creating or editing a JSON file in this repository:

- Use the bundled schemas, relative to this skill. Open them by these paths; never search for them or fetch them remotely. If one is missing, stop and report it.
  - Process `*.p.json` → [schemas/project/process.json](schemas/project/process.json)
  - Data class `*.d.json` → [schemas/project/data-class.json](schemas/project/data-class.json)
  - Form `*.f.json` → [schemas/project/form.json](schemas/project/form.json)
- Before editing, read the complete target JSON and matching schema once. Retain their full contents; reread or search only if a tool reports truncation or a schema reference requires another schema.
- Treat the schema as authoritative: follow all required fields, types, and constraints; do not omit schema requirements or invent structure.
- Schema descriptions are complete. Do not search the workspace for example files unless the user asks or a schema description directs you to.
- No routine post-edit validation is required. Check only when the user asks or a concrete tool-reported problem needs diagnosis.
- For a new file, use `new_axon_ivy_...`; inspect its `$schema` and apply the same local-schema rule before follow-up edits.
- Always indent with 2 spaces, never tabs.
