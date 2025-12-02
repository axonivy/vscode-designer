import { ThemeProvider } from '@axonivy/ui-components';
import '@axonivy/vscode-webview-common/css/colors.css';
import * as React from 'react';
import { createRoot } from 'react-dom/client';

import { WelcomePage } from './components/WelcomePage';
import { initTranslation } from './i18n';
import { VscodeMessengerProvider } from './util/VscodeApiProvider';

export async function start() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  initTranslation();
  createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider disabled={true}>
        <VscodeMessengerProvider>
          <WelcomePage />
        </VscodeMessengerProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}

start();
