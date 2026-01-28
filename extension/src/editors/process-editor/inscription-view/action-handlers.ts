import { InscriptionActionArgs, InscriptionNotificationTypes } from '@axonivy/process-editor-inscription-protocol';
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
      case 'newWebServiceClient':
      case 'openWsConfig':
      case 'newRestClient':
      case 'openRestConfig':
      case 'newDatabaseConfig':
      case 'openDatabaseConfig':
      case 'openCustomField':
      case 'openEndPage':
      case 'newProgram':
      case 'openOrCreateCmsCategory':
      case 'openProgram':
        // TODO: check this actions, if we need to handle them here
        break;
      default:
        noUnknownAction(msg.params.actionId);
    }
    return true;
  }
  return false;
};
