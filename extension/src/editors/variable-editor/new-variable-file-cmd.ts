import fs from 'fs';
import * as vscode from 'vscode';
import { registerCommand } from '../../base/commands';
import { VariableEditorProvider } from './variable-editor-provider';

const fileName = 'variables.yaml';

export const registerNewVariablesFileCmd = (context: vscode.ExtensionContext) => {
  registerCommand('yaml-variables-editor.new', context, () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace found');
      return;
    }
    const configPath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'config');
    if (!fs.existsSync(configPath.fsPath)) {
      vscode.window.showErrorMessage(`No config directory found in the workspace`);
      return;
    }
    const variablesPath = vscode.Uri.joinPath(configPath, fileName);
    if (fs.existsSync(variablesPath.fsPath)) {
      vscode.window.showErrorMessage(`${fileName} file already exists`);
      return;
    }
    vscode.workspace.fs.writeFile(variablesPath, new TextEncoder().encode('Variables:'));
    vscode.commands.executeCommand('vscode.openWith', variablesPath, VariableEditorProvider.viewType);
  });
};
