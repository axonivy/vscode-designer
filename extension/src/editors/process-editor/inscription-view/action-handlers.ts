import type { InscriptionActionArgs, InscriptionNotificationTypes } from '@axonivy/process-editor-inscription-protocol';
import { logWarningMessage } from '../../../base/logging-util';
import { isAction, noUnknownAction } from '../../notification-helper';
import { handleNewProcess } from './new-process';
import { handleNewHtmlDialog } from './new-user-dialog';
import { handleOpenAction } from './open-action';
import { handleOpenPage } from './open-page';

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
      case 'openEndPage':
      case 'newProgram':
      case 'openProgram':
        logWarningMessage(`Action '${msg.params.actionId}' is not yet implemented.`);
        break;
      default:
        noUnknownAction(msg.params.actionId);
    }
    return true;
  }
  return false;
};
