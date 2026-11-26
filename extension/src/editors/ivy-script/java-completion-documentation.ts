import { l10n, type CompletionItem as JavaCompletionItem } from 'vscode';
import type { CompletionItem, MarkupContent } from 'vscode-languageclient';
import { normalizeIvyCompletionLabel } from './ivy-script-java-translation';

// A normal Markdown link survives LSP/Monaco's untrusted Markdown rendering. The webview
// intercepts only this exact URL and sends a project-bound notification; no arbitrary commands run.
export const DOWNLOAD_SOURCES_LINK = 'https://axonivy.invalid/download-dependency-sources';

const missingJavadocHint = (): MarkupContent => ({
  kind: 'markdown',
  value: l10n.t(
    'Javadoc is not available. [Download dependency sources for this Ivy project]({0}), then reopen hover or completion after Java finishes updating. Some dependencies do not publish sources.',
    DOWNLOAD_SOURCES_LINK
  )
});

export const javaCompletionDocumentation = (documentation: JavaCompletionItem['documentation']): string | MarkupContent => {
  const value = typeof documentation === 'string' ? documentation : documentation?.value;
  if (!value?.trim()) {
    return missingJavadocHint();
  }
  return typeof documentation === 'string' ? documentation : { kind: 'markdown', value };
};

export const addJavaCompletionDocumentation = (completionItems: CompletionItem[], javaItems: JavaCompletionItem[]) => {
  const documentationByLabel = new Map<string, JavaCompletionItem['documentation']>();
  for (const javaItem of javaItems) {
    const label = typeof javaItem.label === 'string' ? javaItem.label : javaItem.label.label;
    const normalizedLabel = normalizeIvyCompletionLabel(label);
    // Prefer an overload with documentation over one without it.
    const existing = documentationByLabel.get(normalizedLabel);
    const existingValue = typeof existing === 'string' ? existing : existing?.value;
    if (!existingValue?.trim()) {
      documentationByLabel.set(normalizedLabel, javaItem.documentation);
    }
  }

  for (const item of completionItems) {
    const label = normalizeIvyCompletionLabel(item.label);
    if (!documentationByLabel.has(label)) {
      continue; // Do not add Java hints to Ivy-only suggestions.
    }
    const javaDocumentation = documentationByLabel.get(label);
    const javaMarkdown = typeof javaDocumentation === 'string' ? javaDocumentation : javaDocumentation?.value;
    const existingMarkdown = typeof item.documentation === 'string' ? item.documentation : item.documentation?.value;
    if (!javaMarkdown?.trim() && existingMarkdown?.trim()) {
      continue; // Existing Ivy documentation is sufficient; do not add a missing-doc hint.
    }
    const documentation = javaCompletionDocumentation(javaDocumentation);
    item.documentation = {
      kind: 'markdown',
      value: [existingMarkdown, typeof documentation === 'string' ? documentation : documentation.value].filter(Boolean).join('\n\n')
    };
  }
};
