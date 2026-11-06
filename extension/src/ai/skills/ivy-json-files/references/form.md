# Form

Follow the shared JSON rules in SKILL.md. Use `ivy-ui` for dialog technology, UI composition, component interfaces, and extraction decisions.

## Data bindings

When adding or changing bindings, read `<Name>Data.d.json` and add missing attributes before referencing them. Bind component values as `#{data.<attr>}`, never `in.<attr>`.

## Form Components and embedding

- Add the component's interface attributes to its data class.
- When adding or changing a `Composite`, read the embedded component's User Dialog Start (`<Name>Process.p.json`) and data class.
- Declare start parameters in `config.input.params` and map them into component data with `config.input.map`. Bind the component's inputs to that data. For returned values, declare `config.result.params` and map them with `config.result.map`; keep names and types consistent with the interface.
- Configure the Form type and `Composite` fields according to the schema, using the embedded component's actual User Dialog Start interface.

## Dialog buttons

A `FORM` usually needs Cancel and Proceed buttons, even if not explicitly requested. Choose names that fit the dialog.

Place them last in a `Layout` with `"type": "FLEX"` and `"justifyContent": "END"`, in this order:

- Cancel: `"action": "#{ivyWorkflowView.cancel()}"`, `"processOnlySelf": true`, `"variant": "SECONDARY"`, `"style": "FLAT"`.
- Proceed: `"type": "SUBMIT"`, `"action": "#{logic.close}"`, `"icon": "ti ti-check"`.
