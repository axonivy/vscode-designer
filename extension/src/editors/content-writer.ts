import type { EditorFileContent } from '@axonivy/dataclass-editor-protocol';
import type { TextDocument } from 'vscode';
import { Position, Range, WorkspaceEdit, workspace } from 'vscode';

export const updateTextDocumentContent = async (document: TextDocument, { content }: EditorFileContent) => {
  const workspaceEdit = new WorkspaceEdit();
  workspaceEdit.replace(document.uri, new Range(new Position(0, 0), new Position(document.lineCount + 1, 0)), content);
  await workspace.applyEdit(workspaceEdit);
};
