import { HOST_EXTENSION, type NotificationType } from 'vscode-messenger-common';
import { useMessenger } from './VscodeApiProvider';

const openUrlType: NotificationType<string> = { method: 'openUrl' };
const commandType: NotificationType<string> = { method: 'executeCommand' };

export const useVscode = () => {
  const { messenger } = useMessenger();

  const openUrl = (url: string) => {
    messenger.sendNotification(openUrlType, HOST_EXTENSION, url);
  };

  const executeCommand = (command: string) => {
    messenger.sendNotification(commandType, HOST_EXTENSION, command);
  };

  return { openUrl, executeCommand };
};
