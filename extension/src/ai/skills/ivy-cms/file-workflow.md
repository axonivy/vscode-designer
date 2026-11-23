# File Workflow

## 1. Inspect existing resources

Search `cms/` for a suitable existing file before adding another.

Determine whether the resource is:

- Language-neutral.
- Localized for specific languages.

## 2. Store the file

Place files directly under the appropriate `cms/` directory.
Do not create YAML entries for file content.

| File | CMS path | Locale |
|------|----------|--------|
| `cms/images/Logo.png` | `/images/Logo` | Neutral |
| `cms/Styles/Custom.css` | `/Styles/Custom` | Neutral |
| `cms/documents/instruction.pdf` | `/documents/instruction` | Neutral |
| `cms/documents/instruction_en.pdf` | `/documents/instruction` | English |
| `cms/documents/instruction_de.pdf` | `/documents/instruction` | German |

The CMS path excludes the file extension and locale suffix.
Preserve path capitalization.

For localized resources, provide the required language variants.
Use a neutral file when the content is shared across languages.

## 3. Reference the file

Use `ivy.cm.ref()` to obtain the resource URL:

```xml
<p:graphicImage value="#{ivy.cm.ref('/images/Logo')}" />

<h:outputLink value="#{ivy.cm.ref('/documents/instruction')}">
  #{ivy.cms.co('/Labels/Instructions')}
</h:outputLink>
```

Ensure any text key used alongside the file, such as `/Labels/Instructions`, also exists in every configured language.