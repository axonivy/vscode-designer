import { InscriptionActionArgs } from '@axonivy/process-editor-inscription-protocol';
import * as vscode from 'vscode';
import { IvyProjectExplorer } from '../../../project-explorer/ivy-project-explorer';
import { DialogType, dialogTypes } from '../../../project-explorer/new-user-dialog';
import { SendInscriptionNotification } from './action-handlers';

export const handleNewHtmlDialog = async (actionArgs: InscriptionActionArgs, sendInscriptionNotification: SendInscriptionNotification) => {
  const tabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  if (!(tabInput instanceof vscode.TabInputCustom)) {
    return;
  }
  const dialogType = await collectDialogType();
  if (!dialogType) {
    return;
  }
  await IvyProjectExplorer.instance.addUserDialog(tabInput.uri, dialogType, actionArgs.context.pid);
  sendInscriptionNotification('dataChanged');
  sendInscriptionNotification('validation');
};

const collectDialogType = () =>
  vscode.window.showQuickPick(dialogTypes, {
    title: 'Select Dialog Type',
    ignoreFocusOut: true
  }) as Promise<DialogType | undefined>;
