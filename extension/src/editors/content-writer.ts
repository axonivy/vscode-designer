import { EditorFileContent } from '@axonivy/dataclass-editor-protocol';
import * as vscode from 'vscode';

export const updateTextDocumentContent = async (document: vscode.TextDocument, { content }: EditorFileContent) => {
  const workspaceEdit = new vscode.WorkspaceEdit();
  workspaceEdit.replace(document.uri, new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount + 1, 0)), content);
  await vscode.workspace.applyEdit(workspaceEdit);
};
