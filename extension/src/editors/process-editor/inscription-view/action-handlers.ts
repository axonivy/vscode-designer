import { InscriptionActionArgs, InscriptionNotificationTypes } from '@axonivy/process-editor-inscription-protocol';
import { isAction } from '../../notification-helper';
import { NewProcessActionHandler } from './new-process';
import { NewHtmlDialogActionHandler } from './new-user-dialog';
import { OpenPageActionHandler } from './open-page';

const ActionHandlers = [new NewProcessActionHandler(), new NewHtmlDialogActionHandler(), new OpenPageActionHandler()];

export type SendInscriptionNotification = (type: keyof InscriptionNotificationTypes) => void;

export interface InscriptionActionHandler {
  actionId: InscriptionActionArgs['actionId'];
  handle(actionArgs: InscriptionActionArgs, sendInscriptionNotification: SendInscriptionNotification): Promise<void>;
}

export const handleActionLocal = (msg: unknown, sendInscriptionNotification: SendInscriptionNotification) => {
  if (isAction<InscriptionActionArgs>(msg)) {
    const handler = ActionHandlers.find(handler => handler.actionId === msg.params.actionId);
    if (handler) {
      handler.handle(msg.params, sendInscriptionNotification);
      return true;
    }
  }
  return false;
};
