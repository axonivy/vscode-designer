import type { InscriptionActionArgs } from '@axonivy/process-editor-inscription-protocol';
import { l10n, TabInputCustom, window } from 'vscode';
import { localizeDialogType } from '../../../base/localized-labels';
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

const collectDialogType = async (): Promise<DialogType | undefined> => {
  const items = dialogTypes.map(value => ({ label: localizeDialogType(value), value }));
  const selected = await window.showQuickPick(items, {
    title: l10n.t('Select Dialog Type'),
    ignoreFocusOut: true
  });
  return selected?.value;
};
