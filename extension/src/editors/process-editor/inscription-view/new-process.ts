import { InscriptionActionArgs } from '@axonivy/process-editor-inscription-protocol';
import * as vscode from 'vscode';
import { IvyProjectExplorer } from '../../../project-explorer/ivy-project-explorer';
import { SendInscriptionNotification } from './action-handlers';

export const handleNewProcess = async (actionArgs: InscriptionActionArgs, sendInscriptionNotification: SendInscriptionNotification) => {
  const tabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  if (tabInput instanceof vscode.TabInputCustom) {
    await IvyProjectExplorer.instance.addProcess(tabInput.uri, '', actionArgs.context.pid);
    sendInscriptionNotification('dataChanged');
    sendInscriptionNotification('validation');
  }
};
