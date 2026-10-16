import { App, ClientContextProvider, RoleClientJsonRpc, initQueryClient } from '@axonivy/role-editor';
import '@axonivy/role-editor/lib/editor.css';
import { HotkeysProvider, ReadonlyProvider, ThemeProvider, Toaster } from '@axonivy/ui-components';
import { type InitializeConnection, initMessenger, toConnection } from '@axonivy/vscode-webview-common';
import '@axonivy/vscode-webview-common/css/colors.css';
import { QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Messenger, type VsCodeApi } from 'vscode-messenger-webview';
import { initTranslation } from './i18n';

declare function acquireVsCodeApi(): VsCodeApi;
const messenger = new Messenger(acquireVsCodeApi());

export async function start({ app = '', project = '', file, readOnly = false }: InitializeConnection) {
  const connection = toConnection(messenger, 'roleWebSocketMessage');
  const client = await RoleClientJsonRpc.startClient(connection);
  const queryClient = initQueryClient();
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  initTranslation();
  const context = { app, project, file };
  await client.initialize(context);
  createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider disabled={true}>
        <ClientContextProvider client={client}>
          <QueryClientProvider client={queryClient}>
            <ReadonlyProvider readonly={readOnly}>
              <HotkeysProvider initiallyActiveScopes={['global']}>
                <App context={context} />
                <Toaster closeButton={true} />
              </HotkeysProvider>
            </ReadonlyProvider>
          </QueryClientProvider>
        </ClientContextProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}

initMessenger(messenger, start);
