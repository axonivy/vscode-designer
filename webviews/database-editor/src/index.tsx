import { ClientContextProvider, ClientJsonRpc, DatabaseEditor, initQueryClient } from '@axonivy/database-editor';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import '@axonivy/database-editor/lib/editor.css';
import { HotkeysProvider, ThemeProvider, Toaster } from '@axonivy/ui-components';
import { type InitializeConnection, initMessenger, toConnection } from '@axonivy/vscode-webview-common';
import '@axonivy/vscode-webview-common/css/colors.css';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Messenger, type VsCodeApi } from 'vscode-messenger-webview';
import { initTranslation } from './i18n';

declare function acquireVsCodeApi(): VsCodeApi;
const messenger = new Messenger(acquireVsCodeApi());

export async function start({ file }: InitializeConnection) {
  const connection = toConnection(messenger, 'databaseWebSocketMessage');
  const client = await ClientJsonRpc.startClient(connection);
  const queryClient = initQueryClient();

  const normalized = file.replace(/\\/g, '/');
  const path = normalized.replace('/config/databases.yaml', '');
  const projectName = path.substring(path.lastIndexOf('/') + 1);

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  initTranslation();
  createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider disabled={true}>
        <ClientContextProvider client={client}>
          <QueryClientProvider client={queryClient}>
            <HotkeysProvider initiallyActiveScopes={['global']}>
              <DatabaseEditor context={{ app: '', projects: [projectName], file }} />
              <Toaster closeButton={true} />
            </HotkeysProvider>
            <ReactQueryDevtools initialIsOpen={false} buttonPosition={'bottom-left'} />
          </QueryClientProvider>
        </ClientContextProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}

initMessenger(messenger, start);
