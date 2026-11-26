import { expect, test, vi } from 'vitest';
import type { CompletionItem as JavaCompletionItem, MarkdownString } from 'vscode';
import type { CompletionItem } from 'vscode-languageclient';
import { addJavaCompletionDocumentation, javaCompletionDocumentation } from './java-completion-documentation';

vi.mock('vscode', () => ({
  l10n: {
    t: (message: string, ...args: unknown[]) =>
      args.reduce<string>((result, arg, index) => result.replace(`{${index}}`, String(arg)), message)
  }
}));

const hint = {
  kind: 'markdown',
  value:
    'Javadoc is not available. [Download dependency sources for this Ivy project](https://axonivy.invalid/download-dependency-sources), then reopen hover or completion after Java finishes updating. Some dependencies do not publish sources.'
};

const markdown = (value: string) => ({ value }) as MarkdownString;

// This also covers type suggestions, which have no receiver to hover before completion.
test.each([undefined, '', '  ', markdown(''), markdown('  ')])('adds a hint for missing Java type documentation (%j)', documentation => {
  expect(javaCompletionDocumentation(documentation)).toEqual(hint);
});

test('preserves plain-text Java documentation', () => {
  expect(javaCompletionDocumentation('Security context.')).toBe('Security context.');
});

test('preserves Markdown Java documentation', () => {
  expect(javaCompletionDocumentation(markdown('**Security context.**'))).toEqual({ kind: 'markdown', value: '**Security context.**' });
});

test('adds a hint only to matched Java member suggestions without documentation', () => {
  const items: CompletionItem[] = [{ label: 'current()' }, { label: 'ivyOnly()' }];
  addJavaCompletionDocumentation(items, [{ label: { label: 'current()', description: 'SecurityContext' } }]);
  expect(items[0]?.documentation).toEqual(hint);
  expect(items[1]?.documentation).toBeUndefined();
});

test.each(['Existing Ivy documentation.', { kind: 'markdown' as const, value: 'Existing Ivy documentation.' }])(
  'does not add a hint when Ivy documentation already exists (%j)',
  documentation => {
    const items: CompletionItem[] = [{ label: 'current()', documentation }];
    addJavaCompletionDocumentation(items, [{ label: 'current()' }]);
    expect(items[0]?.documentation).toEqual(documentation);
  }
);

test('appends available Java documentation to existing Ivy documentation', () => {
  const items: CompletionItem[] = [{ label: 'current()', documentation: 'Ivy documentation.' }];
  addJavaCompletionDocumentation(items, [{ label: 'current()', documentation: markdown('Java documentation.') }]);
  expect(items[0]?.documentation).toEqual({ kind: 'markdown', value: 'Ivy documentation.\n\nJava documentation.' });
});

test.each([false, true])('prefers documented overloads regardless of ordering (reverse: %s)', reverse => {
  const items: CompletionItem[] = [{ label: 'current()' }];
  const javaItems: JavaCompletionItem[] = [
    { label: 'current(int arg)', documentation: markdown(' ') },
    { label: 'current()', documentation: 'Java documentation.' }
  ];
  addJavaCompletionDocumentation(items, reverse ? javaItems.reverse() : javaItems);
  expect(items[0]?.documentation).toEqual({ kind: 'markdown', value: 'Java documentation.' });
});

test('keeps Ivy label normalization when adding a hint', () => {
  const items: CompletionItem[] = [{ label: 'task' }];
  addJavaCompletionDocumentation(items, [{ label: 'wfTask()' }]);
  expect(items[0]?.documentation).toEqual(hint);
});
