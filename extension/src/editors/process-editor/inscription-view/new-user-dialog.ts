import { InscriptionActionArgs } from '@axonivy/process-editor-inscription-protocol';
import * as vscode from 'vscode';
import { IvyProjectExplorer } from '../../../project-explorer/ivy-project-explorer';
import { DialogType, dialogTypes } from '../../../project-explorer/new-user-dialog';
import { InscriptionActionHandler, SendInscriptionNotification } from './action-handlers';

export class NewHtmlDialogActionHandler implements InscriptionActionHandler {
  actionId = 'newHtmlDialog' as const;
  async handle(actionArgs: InscriptionActionArgs, sendInscriptionNotification: SendInscriptionNotification) {
    const tabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
    if (!(tabInput instanceof vscode.TabInputCustom)) {
      return;
    }
    const dialogType = await this.collectDialogType();
    if (!dialogType) {
      return;
    }
    await IvyProjectExplorer.instance.addUserDialog(tabInput.uri, dialogType, actionArgs.context.pid);
    sendInscriptionNotification('dataChanged');
    sendInscriptionNotification('validation');
  }

  private collectDialogType(): Promise<DialogType | undefined> {
    return vscode.window.showQuickPick(dialogTypes, {
      title: 'Select Dialog Type',
      ignoreFocusOut: true
    }) as Promise<DialogType | undefined>;
  }
}
