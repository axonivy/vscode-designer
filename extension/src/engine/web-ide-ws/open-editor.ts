import { Uri } from 'vscode';
import { executeCommand } from '../../base/commands';

export const openEditor = async (editor: { uri?: string }) => {
  if (!editor.uri) {
    return false;
  }
  await executeCommand('vscode.open', Uri.parse(editor.uri));
  return true;
};
