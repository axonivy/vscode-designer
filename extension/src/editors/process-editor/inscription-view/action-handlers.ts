import { InscriptionActionArgs, InscriptionNotificationTypes } from '@axonivy/process-editor-inscription-protocol';
import { executeCommand } from '../../../base/commands';
import { logWarningMessage } from '../../../base/logging-util';
import { isAction, noUnknownAction } from '../../notification-helper';
import { handleNewProcess } from './new-process';
import { handleNewHtmlDialog } from './new-user-dialog';
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
        executeCommand('ivyEditor.openRestClientEditor');
        break;
      case 'openWsConfig':
      case 'newWebServiceClient':
        executeCommand('ivyEditor.openWebServiceClientEditor');
        break;
      case 'openDatabaseConfig':
      case 'newDatabaseConfig':
        executeCommand('ivyEditor.openDatabaseEditor');
        break;
      case 'openCustomField':
        executeCommand('ivyEditor.openCustomFieldEditor');
        break;
      case 'openOrCreateCmsCategory':
        executeCommand('ivyEditor.openCmsEditor');
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
