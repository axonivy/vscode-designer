import { Uri, window, type ExtensionContext, type OpenDialogOptions } from 'vscode';

type FileDialogWorkflow = 'importIvyProject' | 'importBpmnProcess' | 'installLocalMarketProduct';

export const showRememberedFileDialog = async (
  context: Pick<ExtensionContext, 'globalState'>,
  workflow: FileDialogWorkflow,
  options: OpenDialogOptions
) => {
  const key = `axonivy.${workflow}.lastSourceFolderUri`;
  const lastFolderUri = context.globalState.get<string>(key);
  const selectedUris = await window.showOpenDialog({
    ...options,
    defaultUri: lastFolderUri ? Uri.parse(lastFolderUri) : options.defaultUri
  });
  if (selectedUris?.[0]) {
    await context.globalState.update(key, Uri.joinPath(selectedUris[0], '..').toString());
  }
  return selectedUris;
};
