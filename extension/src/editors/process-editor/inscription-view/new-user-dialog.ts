import type { InscriptionActionArgs } from '@axonivy/process-editor-inscription-protocol';
import { TabInputCustom, window } from 'vscode';
import { IvyProjectExplorer } from '../../../project-explorer/ivy-project-explorer';
import { dialogTypes, type DialogType } from '../../../project-explorer/new-user-dialog';
import type { SendInscriptionNotification } from './action-handlers';

export const handleNewHtmlDialog = async (actionArgs: InscriptionActionArgs, sendInscriptionNotification: SendInscriptionNotification) => {
  const tabInput = window.tabGroups.activeTabGroup.activeTab?.input;
  if (!(tabInput instanceof TabInputCustom)) {
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
  window.showQuickPick(dialogTypes, {
    title: 'Select Dialog Type',
    ignoreFocusOut: true
  }) as Promise<DialogType | undefined>;
