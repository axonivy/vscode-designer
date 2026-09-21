import { chat, TabInputCustom, workspace, type ChatContextItem, type ExtensionContext } from 'vscode';
import { RestClientEditorProvider } from './restclient-editor-provider';

const providerId = 'ivy.restClientEditor';

export function registerRestClientChatContextProvider(context: ExtensionContext) {
  const register = (chat as typeof chat & { registerChatTabContextProvider?: typeof chat.registerChatTabContextProvider })
    .registerChatTabContextProvider;

  if (!register) {
    return;
  }

  try {
    const disposable = register({ viewType: RestClientEditorProvider.viewType }, providerId, {
      provideChatTabContext: async ({ tab }) => {
        const input = tab.input;
        if (!(input instanceof TabInputCustom) || input.viewType !== RestClientEditorProvider.viewType) {
          return undefined;
        }

        return createContextItem(input.uri);
      },
      resolveChatTabContext: async contextItem => {
        if (!contextItem.resourceUri) {
          return contextItem;
        }

        return {
          ...contextItem,
          value: (await workspace.openTextDocument(contextItem.resourceUri)).getText()
        };
      }
    });
    context.subscriptions.push(disposable);
  } catch {
    return;
  }
}

async function createContextItem(uri: import('vscode').Uri): Promise<ChatContextItem> {
  return {
    label: 'Rest Clients',
    resourceUri: uri,
    modelDescription: 'Axon Ivy REST client configuration from rest-clients.yaml',
    value: (await workspace.openTextDocument(uri)).getText()
  };
}
