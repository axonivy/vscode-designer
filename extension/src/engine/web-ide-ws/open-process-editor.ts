import { TabInputCustom, Uri, window } from 'vscode';
import { animationSettings } from '../../base/configurations';
import type { ProcessBean } from '../api/generated/client';
import { openEditor } from './open-editor';

export const handleOpenProcessEditor = async (process: ProcessBean) => {
  if (!process.uri) {
    return false;
  }
  switch (animationSettings().mode) {
    case 'all':
      return openEditor(process);
    case 'currentProcess':
      return isCurrentProcess(process);
    case 'openProcesses':
      if (isOpenProcesses(process)) {
        return openEditor(process);
      }
      return false;
    case 'noDialogProcesses':
      if (process.kind === 'HTML_DIALOG') {
        return false;
      }
      return openEditor(process);
    case 'noEmbeddedProcesses':
      return openEditor(process);
    default:
      return false;
  }
};

const isCurrentProcess = (process: ProcessBean) => {
  const tabInput = window.tabGroups.activeTabGroup.activeTab?.input;
  if (tabInput instanceof TabInputCustom && process.uri) {
    return tabInput.uri.fsPath === Uri.parse(process.uri).fsPath;
  }
  return false;
};

const isOpenProcesses = (process: ProcessBean) => {
  if (!process.uri) {
    return false;
  }
  const processUri = Uri.parse(process.uri);
  return (
    window.tabGroups.all
      .flatMap(tabGroup => tabGroup.tabs.flatMap(tabs => tabs.input as { uri: Uri }))
      .filter(input => input && input.uri)
      .filter(input => input.uri.fsPath === processUri.fsPath).length > 0
  );
};
