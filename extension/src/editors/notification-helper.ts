import type { EditorFileContent } from '@axonivy/dataclass-editor-protocol';
import { Uri, env } from 'vscode';
import type { NotificationType } from 'vscode-messenger-common';
import { logErrorMessage, logInformationMessage } from '../base/logging-util';

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

export const isIntegrationRequest = (obj: unknown): obj is { method: `integration/${string}`; id: number; params: unknown } => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'method' in obj &&
    typeof obj.method === 'string' &&
    obj.method.startsWith('integration/') &&
    'id' in obj &&
    typeof obj.id === 'number' &&
    'params' in obj
  );
};

export const createJsonRpcSuccessResponse = (request: { id: number }, result: unknown): string => {
  return JSON.stringify({ jsonrpc: '2.0', id: request.id, result });
};

export const createJsonRpcErrorResponse = (request: { id: number }, code: number, message: string): string => {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: request.id,
    error: { code, message }
  });
};

export const createMethodNotFoundResponse = (request: { id: number }, method: string): string => {
  return createJsonRpcErrorResponse(request, -32601, `Unsupported integration method: ${method}`);
};

export const noUnknownIntegrationMethod = (request: { id: number }, method: string): string => {
  const errorMessage = `Unsupported integration method: ${method}`;
  logErrorMessage(errorMessage);
  return createJsonRpcErrorResponse(request, -32601, errorMessage);
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

export const noUnknownAction = (action: never) => logErrorMessage(`Unknown action: ${action}`);

export const isAllTypesSearchRequest = <T>(obj: unknown): obj is { method: string; params: T; id: number } => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'method' in obj &&
    obj.method === 'meta/scripting/allTypes' &&
    'params' in obj &&
    typeof obj.params === 'object' &&
    obj.params !== null &&
    'id' in obj &&
    typeof obj.id === 'number'
  );
};

export const isSearchResult = <T>(obj: unknown, id?: number): obj is { result: T[]; id: number } => {
  if (!id) {
    return false;
  }
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'result' in obj &&
    typeof obj.result === 'object' &&
    obj.result !== null &&
    'id' in obj &&
    obj.id === id
  );
};

export const openUrlExternally = (url: string) => {
  logInformationMessage(`Opening URL externally: ${url}`);
  env.openExternal(Uri.parse(url));
};
