import type { WebviewPanel } from 'vscode';

class CmsEditorRegistryImpl {
  private editors = new Map<string, WebviewPanel>();

  register(projectPath: string, panel: WebviewPanel) {
    this.editors.set(projectPath, panel);
    panel.onDidDispose(() => this.editors.delete(projectPath));
  }

  find(projectPath: string): WebviewPanel | undefined {
    return this.editors.get(projectPath);
  }
}

export const CmsEditorRegistry = new CmsEditorRegistryImpl();
