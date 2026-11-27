---
name: ivy-cms
description: 'Create, reuse, and update Axon Ivy CMS content, including UI labels, translations, email templates, and files. Use when adding or changing user-visible text in XHTML dialogs or managing multilingual CMS resources.'
user-invocable: true
---

# Ivy CMS

Manage content under `<project>/cms/`. Preserve existing content and references unless the task requires changing them.

## Select the Workflow

Read the relevant file before making changes:

- Text content: Read `text-workflow.md` for labels, translations, messages, and email templates stored in `cms_<locale>.yaml`.
- File content: Read `file-workflow.md` for images, CSS, PDFs, and other resources stored directly under `cms/`.
- Mixed changes: Read both files.

## Related Skills

- Use `ivy-yaml-files` when editing or validating CMS YAML.
- Use `axon-ivy-html` when editing XHTML dialogs.
