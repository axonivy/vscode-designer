import type { TextDocument } from 'vscode';
import { TabInputCustom, TabInputText, window, workspace } from 'vscode';

export const getActiveDialogPreviewDocumentUri = () => {
  const tabInput = window.tabGroups.activeTabGroup.activeTab?.input;
  if (tabInput instanceof TabInputText || tabInput instanceof TabInputCustom) {
    return tabInput.uri;
  }
  return window.activeTextEditor?.document.uri;
};

export const getActiveDialogPreviewDocument = async (): Promise<TextDocument | undefined> => {
  const uri = getActiveDialogPreviewDocumentUri();
  if (!uri) {
    return undefined;
  }
  const activeDocument = workspace.textDocuments.find(document => document.uri.toString() === uri.toString());
  if (activeDocument) {
    return activeDocument;
  }
  try {
    return await workspace.openTextDocument(uri);
  } catch {
    return undefined;
  }
};
