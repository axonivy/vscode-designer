---
name: ivy-ui
description: 'MUST use when creating, modifying, composing, or extracting Axon Ivy dialog UIs, including Forms (*.f.json) and JSF XHTML views (*.xhtml).'
user-invocable: false
---

# Dialog UI

Follow these steps for new dialogs and changes to existing ones.

## 1. Choose technology

- Honor an explicitly requested dialog type; otherwise use Form and Form Components.
- Form supports text, email, password, and number inputs; textareas; date pickers; selects; comboboxes; radios; checkboxes; buttons; links; text; data tables; panels; fieldsets; grid and flex layouts; embedded Form Components; and HTML Dialog Components.
- Use JSF only for what Form cannot do. Preserve an existing Form and embed unsupported UI in a JSF HTML Dialog Component, unless the user explicitly requests converting the parent to JSF. Create the component with `new_axon_ivy_dialog`, `type: "JSF"`, `layout: "Component"`. A `Composite` embeds either kind.

## 2. Plan parts, layout and components

Before designing data or UI, split the request into named parts with one responsibility each.

1. **Find repeated parts.** Parts with the same fields and behavior are one part, even with different labels or data.
2. **Plan the layout.** Before implementing, sketch how the parts are arranged in their parent; in an existing dialog, fit them into its structure.
3. **Pick components.** Reuse a matching existing component, or create one, when the part is:
   - **Repeated** in this or another dialog: use one reusable component, even with different labels or data, unless the user explicitly requests inline controls.
   - **Large:** a sizable section of a long page that maps to its own piece of data.
   - **Self-contained:** its actions work only on its own data.
   - **Requested** as a component or reusable part.
   - **Unsupported** by Form and can be isolated (see "Choose technology").

   Otherwise keep it inline.

## 3. Define data and interfaces

- Derive parameters from the part's actual data dependencies. Decide what it receives and returns, where its actions live, and when changes reach the parent.
- A repeated part gets one shared data type, separate from the component's own `<Name>Data`, used for each occurrence and passed as one object so edits reach the parent; create it if missing.
- Otherwise reuse existing types; add no wrapper classes and don't duplicate parent fields.

## 4. Implement

- Create missing data classes with `new_axon_ivy_data_class`, dialogs and components with `new_axon_ivy_dialog`.
- Connect parent and component through the component's User Dialog Start.
- Move the part's action flows and data into the component's process, preserving behavior; component logic resolves against its own process. Remove parent flows only when nothing calls them.
- Use `ivy-json-files` for Form, process and data-class JSON, including its Form reference for bindings and `Composite`. For XHTML, follow the existing conventions.
