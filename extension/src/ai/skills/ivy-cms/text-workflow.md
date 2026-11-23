# Text Workflow

## 1. Inspect the project

Identify:

- Existing `cms_*.yaml` files and configured languages.
- Existing namespaces and naming conventions.
- Translation terminology and tone.
- The dialog package, process, or template being changed.

If no language files exist, create files for the configured languages.
If no languages are configured, start with `cms_en.yaml`.

## 2. Move hardcoded text to CMS

When create or modify an XHTML dialog, replace hardcoded texts with CMS:

- Titles, headers.
- Labels, placeholders, and tooltips.
- Validation, error, and confirmation messages.
- Descriptions, and alternative text.

Keep HTML structure, CSS classes, component IDs, technical attributes, icon names, and EL expressions unchanged.

## 3. Reuse existing content

Reuse an entry when its text and context match:

1. Search CMS files for matching text and meaning.
2. Confirm that the candidate fits the intended business context.
3. Check that it has values in every configured language.

Create a new key only when no suitable entry exists.
If a CMS entry lacks translation, add that translation.

Prefer:

```xml
<p:commandButton value="#{ivy.cms.co('/Labels/Submit')}" />
```

Avoid creating CMS entry when there is existing CMS entry for the same purpose.

Do not reuse text solely because the English wording matches; its meaning must also match.

## 4. Choose a namespace

Use these namespaces for new content:

- `/Labels/<Key>`: Shared labels, such as Cancel, Submit, and Status.
- `/Dialogs/<package/path>/<Dialog>/<Key>`: Dialog-specific text.
- `/Processes/<package/path>/<Process>/<Key>`: Process names and descriptions.
- `/Email/<Template>/<Key>`: Email subjects and body content.

For dialog-specific content, convert the package dots to path separators:

- Dialog: `hr.onboarding.StartOnboarding`
- CMS path: `/Dialogs/hr/onboarding/StartOnboarding/Title`

Represent the CMS path as nested YAML mappings:

```yaml
Dialogs:
  hr:
    onboarding:
      StartOnboarding:
        Title: Start Employee Onboarding
```

Do not write the entire hierarchy as one colon-separated YAML key.

## 5. Add or update translations

Apply the same key structure to every configured language file.

- Use accurate, context-appropriate translations.
- Match the project's existing tone, including formal or informal address.
- Preserve established technical and business terminology.
- Preserve placeholders such as `{0}` and `{1}` across translations.
- Do not overwrite unrelated content or translations.
- If a translation is uncertain, report it rather than presenting it as verified.

Example `cms_en.yaml`:

```yaml
Dialogs:
  hr:
    onboarding:
      StartOnboarding:
        Title: Start Employee Onboarding
Labels:
  Submit: Submit
  'Yes': 'Yes'
Email:
  OnboardingNotification:
    subject: 'New Onboarding: {0}'
```

Example `cms_de.yaml`:

```yaml
Dialogs:
  hr:
    onboarding:
      StartOnboarding:
        Title: Mitarbeiter-Onboarding starten
Labels:
  Submit: Absenden
  'Yes': Ja
Email:
  OnboardingNotification:
    subject: 'Neues Onboarding: {0}'
```

### YAML safeguards

Follow `ivy-yaml-files` for general YAML rules.

For CMS content:

- Keep keys and text values as strings.
- Quote boolean-like keys such as `Yes`, `No`, `True`, `False`, `On`, and `Off`.
- Quote values when YAML could interpret them as another type or syntax.
- Escape a single quote inside a single-quoted value by doubling it.

```yaml
Labels:
  'No': 'No'
  Note: 'Status: pending'
  Example: 'The ''quoted'' text'
```

## 6. Reference the content

### XHTML

```xml
<h2>#{ivy.cms.co('/Dialogs/hr/onboarding/StartOnboarding/Title')}</h2>

<p:commandButton value="#{ivy.cms.co('/Labels/Submit')}" />

<h:outputFormat value="#{ivy.cms.co('/Email/OnboardingNotification/greeting')}">
  <f:param value="#{data.userName}" />
</h:outputFormat>
```

### Java

```java
String label = Ivy.cms().co("/Labels/Submit");

String greeting = Ivy.cms().co(
    "/Email/OnboardingNotification/greeting",
    Arrays.asList(userName));
```

### IvyScript

```java
String label = ivy.cms.co("/Labels/Submit");
```

### Process template expressions

```text
<%=ivy.cms.co('/Labels/Submit')%>
```

Use syntax appropriate to the target editor or template field.
