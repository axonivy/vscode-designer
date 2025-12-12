import * as vscode from 'vscode';
import { IvyProjectExplorer } from '../../project-explorer/ivy-project-explorer';

class CmsEditorRegistryImpl {
  private editors = new Map<string, vscode.WebviewPanel>();

  register(projectPath: string, panel: vscode.WebviewPanel) {
    this.editors.set(projectPath, panel);
    panel.onDidChangeViewState((event: vscode.WebviewPanelOnDidChangeViewStateEvent) => {
      if (event.webviewPanel.active) {
        IvyProjectExplorer.instance.selectCmsEntry(projectPath);
      }
    });
    panel.onDidDispose(() => this.editors.delete(projectPath));
  }

  find(projectPath: string): vscode.WebviewPanel | undefined {
    return this.editors.get(projectPath);
  }

  findActive() {
    for (const [projectPath, panel] of this.editors) {
      if (panel.active) {
        return projectPath;
      }
    }
  }
}

export const CmsEditorRegistry = new CmsEditorRegistryImpl();
