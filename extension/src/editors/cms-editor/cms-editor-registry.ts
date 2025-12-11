import * as vscode from 'vscode';

class CmsEditorRegistryImpl {
  private editors = new Map<string, vscode.WebviewPanel>();

  register(projectPath: string, panel: vscode.WebviewPanel) {
    this.editors.set(projectPath, panel);
    panel.onDidDispose(() => this.editors.delete(projectPath));
  }

  find(projectPath: string): vscode.WebviewPanel | undefined {
    return this.editors.get(projectPath);
  }
}

export const CmsEditorRegistry = new CmsEditorRegistryImpl();
