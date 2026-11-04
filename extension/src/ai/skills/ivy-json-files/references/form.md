# Form

Follow the shared JSON rules in SKILL.md, then apply the relevant steps:

1. **Data bindings:** when adding or changing bindings, read `<Name>Data.d.json` and add missing attributes before referencing them. Bind component values as `#{data.<attr>}`, never `in.<attr>`.
2. **Embedded components:** when adding or changing a `Composite`, read the embedded component's User Dialog Start (`<Name>Process.p.json`) and data class. Each `parameters` entry must match a parameter in `config.input.params`, be mapped into component data by `config.input.map`, and be referenced through that data by the component's inputs.
3. **Form edits:** apply the requested changes using the schema. For `FORM`, consider Cancel and Proceed buttons as described below. This does not apply to `COMPONENT`.

## Dialog buttons

A `FORM` usually needs Cancel and Proceed buttons, even if not explicitly requested. Choose names that fit the dialog.

Place them last in a `Layout` with `"type": "FLEX"` and `"justifyContent": "END"`, in this order:

- Cancel: `"action": "#{ivyWorkflowView.cancel()}"`, `"processOnlySelf": true`, `"variant": "SECONDARY"`, `"style": "FLAT"`.
- Proceed: `"type": "SUBMIT"`, `"action": "#{logic.close}"`, `"icon": "ti ti-check"`.
