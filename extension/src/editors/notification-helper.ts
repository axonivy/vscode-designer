import { EditorFileContent } from '@axonivy/dataclass-editor-protocol';
import { NotificationType } from 'vscode-messenger-common';

export const WebviewReadyNotification: NotificationType<void> = { method: 'ready' };
export const InitializeConnectionRequest: NotificationType<{ file: string }> = { method: 'initializeConnection' };

export const isAction = <T>(obj: unknown): obj is { method: string; params: T } => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'method' in obj &&
    obj.method === 'action' &&
    'params' in obj &&
    typeof obj.params === 'object' &&
    obj.params !== null
  );
};
export const hasEditorFileContent = (obj: unknown): obj is { jsonrpc: string; id: number; result: EditorFileContent } => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'result' in obj &&
    typeof obj.result === 'object' &&
    obj.result !== null &&
    'content' in obj.result &&
    typeof obj.result.content === 'string'
  );
};
