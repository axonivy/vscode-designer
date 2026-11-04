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
- Use JSF only for what Form cannot do. Preserve an existing Form and embed unsupported UI in a JSF HTML Dialog Component, unless the user explicitly requests converting the parent to JSF. Create the component with `new_axon_ivy_dialog`, `type: "JSF"`, `layout: "Component"`.

## 2. Plan parts, components and layout

Before designing data or UI, split the request into named parts with one responsibility each. Write this plan in your reply before creating any file.

1. **Pick components.** Reuse a matching existing component, or create one, when the part is:
   - **Repeated:** the same group of fields appears more than once in this or another dialog (e.g. billing and delivery address). Use one component for all occurrences, even with different labels or data, unless the user explicitly requests inline controls.
   - **Large:** a sizable section of a long page that maps to its own piece of data.
   - **Self-contained:** its actions work only on its own data.
   - **Requested** as a component or reusable part.
   - **Unsupported** by Form and can be isolated (see "Choose technology").

   Otherwise keep it inline.
2. **Plan the layout.** Follow the layout or mockup the user gives. Otherwise, before implementing, decide which parts share a row and which take the full width, using the layout options of the chosen technology. In an existing dialog, keep its structure.

## 3. Define data and interfaces

- Derive parameters from the part's actual data dependencies. Decide what it receives and returns, where its actions live, and when changes reach the parent.
- A repeated part gets one shared data type, separate from the component's own `<Name>Data`, used for each occurrence and passed as one object so edits reach the parent; create it if missing.
- Otherwise reuse existing types; add no wrapper classes and don't duplicate parent fields.

## 4. Implement

- Create missing data classes with `new_axon_ivy_data_class`, dialogs and components with `new_axon_ivy_dialog`.
- Bindings refer to the dialog's data class (`<Name>Data.d.json`); add missing attributes before binding to them.
- When extracting a part from an existing dialog, move its action flows and data into the component's process, preserving behavior. Remove parent flows only when nothing calls them.
