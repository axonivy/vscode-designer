import { ThemeProvider, Toaster } from '@axonivy/ui-components';
import '@axonivy/vscode-webview-common/css/colors.css';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import type { NotificationType } from 'vscode-messenger-common';
import { WelcomePage } from './components/WelcomePage';
import { initTranslation } from './i18n';
import { FeedStore, type NewsFeed } from './util/FeedStore';
import { VersionStore } from './util/VersionStore';
import { getMessenger, VscodeMessengerProvider } from './util/VscodeApiProvider';

const newsFeedType: NotificationType<NewsFeed> = { method: 'newsFeed' };
const versionType: NotificationType<string> = { method: 'versionDelivered' };

export async function start() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  const messenger = getMessenger();
  messenger.onNotification(newsFeedType, FeedStore.setFeed);
  messenger.onNotification(versionType, VersionStore.setVersion);

  initTranslation();
  createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider disabled={true}>
        <VscodeMessengerProvider messenger={messenger}>
          <WelcomePage />
          <Toaster closeButton={true} />
        </VscodeMessengerProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}

start();
