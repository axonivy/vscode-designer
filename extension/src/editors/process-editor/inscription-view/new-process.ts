import type { InscriptionActionArgs } from '@axonivy/process-editor-inscription-protocol';
import { TabInputCustom, window } from 'vscode';
import { IvyProjectExplorer } from '../../../project-explorer/ivy-project-explorer';
import type { SendInscriptionNotification } from './action-handlers';

export const handleNewProcess = async (actionArgs: InscriptionActionArgs, sendInscriptionNotification: SendInscriptionNotification) => {
  const tabInput = window.tabGroups.activeTabGroup.activeTab?.input;
  if (tabInput instanceof TabInputCustom) {
    await IvyProjectExplorer.instance.addProcess(tabInput.uri, '', actionArgs.context.pid);
    sendInscriptionNotification('dataChanged');
    sendInscriptionNotification('validation');
  }
};
