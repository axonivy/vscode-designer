---
name: yaml-files
description: 'Use when creating or editing any YAML file in this repository, including **/*.yaml and **/*.yml files.'
user-invocable: false
---

# YAML Files

Apply these rules whenever creating or editing a YAML file in this repository:

- Respect and preserve the `$schema` reference (or YAML schema comment), and fetch it when necessary before editing.
- When creating or editing YAML, use literal spaces for indentation in the initial patch. Never emit tab characters.
- Always indent with 2 spaces, never tabs, and do not rely on a post-edit replacement or cleanup command.
