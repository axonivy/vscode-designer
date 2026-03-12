import * as vscode from 'vscode';

class PomCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const text = document.getText();
    const match = text.match(/<dependencies>/);
    if (!match || match.index === undefined) {
      return [];
    }
    const pos = document.positionAt(match.index);
    const range = new vscode.Range(pos, pos);
    return [
      new vscode.CodeLens(range, {
        title: '$(add) Add Ivy Dependency',
        command: 'ivyProjects.addDependency',
        arguments: [document.uri]
      })
    ];
  }
}

export const registerPomCodeLensProvider = (context: vscode.ExtensionContext) => {
  context.subscriptions.push(vscode.languages.registerCodeLensProvider({ pattern: '**/pom.xml' }, new PomCodeLensProvider()));
};
