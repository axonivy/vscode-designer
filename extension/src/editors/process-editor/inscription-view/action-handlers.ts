import type { InscriptionActionArgs, InscriptionNotificationTypes } from '@axonivy/process-editor-inscription-protocol';
import { l10n } from 'vscode';
import { logWarningMessage } from '../../../base/logging-util';
import { isAction, noUnknownAction } from '../../notification-helper';
import { handleNewProcess } from './new-process';
import { handleNewHtmlDialog } from './new-user-dialog';
import { handleOpenAction } from './open-action';
import { handleOpenPage } from './open-page';
import { handleOpenProgram } from './open-program';

export type SendInscriptionNotification = (type: keyof InscriptionNotificationTypes) => void;

export const handleActionLocal = (msg: unknown, sendInscriptionNotification: SendInscriptionNotification) => {
  if (isAction<InscriptionActionArgs>(msg)) {
    switch (msg.params.actionId) {
      case 'openPage':
        handleOpenPage(msg.params);
        break;
      case 'newProcess':
        handleNewProcess(msg.params, sendInscriptionNotification);
        break;
      case 'newHtmlDialog':
        handleNewHtmlDialog(msg.params, sendInscriptionNotification);
        break;
      case 'openRestConfig':
      case 'newRestClient':
        handleOpenAction('ivyEditor.openRestClientEditor', msg.params);
        break;
      case 'openWsConfig':
      case 'newWebServiceClient':
        handleOpenAction('ivyEditor.openWebServiceClientEditor', msg.params);
        break;
      case 'openDatabaseConfig':
      case 'newDatabaseConfig':
        handleOpenAction('ivyEditor.openDatabaseEditor', msg.params);
        break;
      case 'openCustomField':
        handleOpenAction('ivyEditor.openCustomFieldEditor', msg.params);
        break;
      case 'openCms':
        handleOpenAction('ivyEditor.openCmsEditor', msg.params);
        break;
      case 'openProgram':
        handleOpenProgram(msg.params);
        break;
      case 'newProgram':
      case 'openEndPage':
        logWarningMessage(l10n.t("Action '{0}' is not yet implemented.", msg.params.actionId));
        break;
      default:
        noUnknownAction(msg.params.actionId);
    }
    return true;
  }
  return false;
};
