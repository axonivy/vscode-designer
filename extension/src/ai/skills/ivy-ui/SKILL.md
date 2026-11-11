---
name: ivy-ui
description: 'MUST use when creating, modifying, composing, or extracting Axon Ivy dialog UIs, including Forms (*.f.json) and JSF XHTML views (*.xhtml).'
user-invocable: false
---

# Dialog UI

Follow these steps for new dialogs and changes to existing ones.

## 1. Plan parts and components

Before creating any file, split the request into named parts with one responsibility each, and write the plan in your reply. Decide each part by the first rule that matches. Reuse a matching existing component before creating one.

1. **Unsupported:** no Form feature covers it → a JSF HTML Dialog Component (`new_axon_ivy_dialog`, `type: "JSF"`, `layout: "Component"`), embedded in the Form with a `Composite`. Form features: text, email, password, and number inputs; textareas; date pickers; selects; comboboxes; radios; checkboxes; buttons; links; text; data tables; panels; fieldsets; grid and flex layouts.
2. **Repeated:** the same group of fields appears more than once in this or another dialog (e.g. billing and delivery address) → one component used for every occurrence, even with different labels or data. A fieldset per occurrence is still inline. Keep it inline only if the user explicitly asks for inline controls.
3. **Large, self-contained or requested:** a sizable section of a long page with its own piece of data, a part whose actions work only on its own data, or a part the user asks to make reusable → its own component.
4. Otherwise keep it inline.

The dialog and its components are Forms. Use JSF instead only when the user explicitly asks for it or no part fits Form. In an existing dialog, keep its technology.

## 2. Plan the layout

Follow the layout or mockup the user gives. Otherwise, decide which parts share a row and which take the full width, using the layout options of the dialog's technology. In an existing dialog, keep its structure.

## 3. Define data and interfaces

- Derive parameters from the part's actual data dependencies. Decide what it receives and returns, where its actions live, and when changes reach the parent.
- A repeated part gets one shared data type, separate from the component's own `<Name>Data`, used for each occurrence and passed as one object so edits reach the parent; create it if missing.
- Otherwise reuse existing types; add no wrapper classes and don't duplicate parent fields.

## 4. Implement

1. Create every missing data class with `new_axon_ivy_data_class` and every dialog and component with `new_axon_ivy_dialog` first.
2. Then fill each file once, completely: shared data types, then components, then the parent dialog. In each dialog, add the attributes to its `<Name>Data.d.json` before the view binds to them.

When extracting a part from an existing dialog, move its action flows and data into the component's process, preserving behavior. Remove parent flows only when nothing calls them.

A `FORM` usually needs Cancel and Proceed buttons, even if not explicitly requested. Choose names that fit the dialog. Place them as the form's last top-level component, in a `Layout` with `"type": "FLEX"` and `"justifyContent": "END"`, in this order:

- Cancel: `"action": "#{ivyWorkflowView.cancel()}"`, `"processOnlySelf": true`, `"variant": "SECONDARY"`, `"style": "FLAT"`.
- Proceed: `"type": "SUBMIT"`, `"action": "#{logic.close}"`, `"icon": "ti ti-check"`.
