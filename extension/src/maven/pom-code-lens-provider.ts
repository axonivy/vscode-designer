import type { CodeLensProvider, ExtensionContext, TextDocument } from 'vscode';
import { CodeLens, l10n, languages, Range } from 'vscode';

class PomCodeLensProvider implements CodeLensProvider {
  provideCodeLenses(document: TextDocument): CodeLens[] {
    const text = document.getText();
    const match = text.match(/<dependencies>/);
    if (!match || match.index === undefined) {
      return [];
    }
    const pos = document.positionAt(match.index);
    const range = new Range(pos, pos);
    return [
      new CodeLens(range, {
        title: `$(add) ${l10n.t('Add Ivy Project Dependency')}`,
        command: 'ivyProjects.addDependency',
        arguments: [document.uri]
      })
    ];
  }
}

export const registerPomCodeLensProvider = (context: ExtensionContext) => {
  context.subscriptions.push(languages.registerCodeLensProvider({ pattern: '**/pom.xml' }, new PomCodeLensProvider()));
};
