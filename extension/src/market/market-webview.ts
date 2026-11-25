import { ColorThemeKind, commands, l10n, ViewColumn, window, type WebviewPanel } from 'vscode';
import { logErrorMessage, logWarningMessage } from '../base/logging-util';
import { createNonce } from '../base/nonce-util';
import { openUrlExternally } from '../editors/notification-helper';

const MARKET_ORIGIN = 'https://market.axonivy.com';
const MARKET_SOURCE = 'axonivy-market';
const VSCODE_SOURCE = 'axonivy-vscode-designer';
const INSTALL_MESSAGE = 'ivy.market.install';
const MARKET_PANEL_PATH = /^(\/[a-z]{2})?(\/|\/product\/[^/]+\/?)?$/;

export const marketProductUrl = (productId: string) => `${MARKET_ORIGIN}/product/${encodeURIComponent(productId)}/`;

export const openMarketUrl = (url: string) => {
  const target = URL.parse(url);
  if (target?.origin !== MARKET_ORIGIN) {
    openUrlExternally(url);
    return;
  }

  if (MARKET_PANEL_PATH.test(target.pathname)) {
    openMarket(target);
    return;
  }
  openUrlExternally(url);
};

type ThemeReadyMessage = { source: typeof MARKET_SOURCE; type: 'theme-ready' };
type InstallMessage = { type: typeof INSTALL_MESSAGE; productName?: unknown };

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isThemeReady = (message: unknown): message is ThemeReadyMessage =>
  isObject(message) && message.source === MARKET_SOURCE && message.type === 'theme-ready';

const isInstallMessage = (message: unknown): message is InstallMessage => isObject(message) && message.type === INSTALL_MESSAGE;

const EXTERNAL_PROTOCOLS = ['https:', 'http:', 'mailto:'];

const externalLinkTarget = (message: unknown): URL | undefined => {
  if (!isObject(message) || message.source !== MARKET_SOURCE || message.type !== 'open-external' || typeof message.url !== 'string') {
    return undefined;
  }
  const url = URL.parse(message.url);
  return url && EXTERNAL_PROTOCOLS.includes(url.protocol) ? url : undefined;
};

let marketPanel: WebviewPanel | undefined;

export const openMarket = (target?: URL) => {
  const marketUrl = createMarketUrl(target);
  if (marketPanel) {
    marketPanel.reveal();
    void marketPanel.webview.postMessage({ source: VSCODE_SOURCE, type: 'navigate', url: marketUrl.href });
    return;
  }
  const panel = window.createWebviewPanel('ivy.market', l10n.t('Axon Ivy Market'), ViewColumn.One, {
    enableScripts: true,
    localResourceRoots: [],
    retainContextWhenHidden: true
  });
  marketPanel = panel;
  const sendCurrentTheme = () => panel.webview.postMessage(createThemeMessage(window.activeColorTheme.kind));
  let themeReady = false;
  const subscription = panel.webview.onDidReceiveMessage(async (message: unknown) => {
    if (isThemeReady(message)) {
      themeReady = true;
      await sendCurrentTheme();
      return;
    }
    const externalLink = externalLinkTarget(message);
    if (externalLink) {
      openUrlExternally(externalLink.href);
      return;
    }
    if (!isInstallMessage(message)) {
      logWarningMessage(l10n.t('Unsupported Market webview message.'));
      return;
    }
    const { productName } = message;
    if (productName !== undefined && (typeof productName !== 'string' || !productName.trim())) {
      logWarningMessage(l10n.t('Invalid Market product name.'));
      return;
    }
    try {
      await commands.executeCommand('ivyProjects.installMarketProduct', productName?.trim());
    } catch (error) {
      logErrorMessage(l10n.t('Market installation failed: {0}', error instanceof Error ? error.message : String(error)));
    }
  });
  const themeSubscription = window.onDidChangeActiveColorTheme(() => {
    if (themeReady) {
      void sendCurrentTheme();
    }
  });
  panel.onDidDispose(() => {
    subscription.dispose();
    themeSubscription.dispose();
    marketPanel = undefined;
  });
  panel.webview.html = createMarketContent(marketUrl, panel.title);
};

const createMarketUrl = (target?: URL) => {
  const marketUrl = new URL(MARKET_ORIGIN);
  if (target) {
    marketUrl.pathname = target.pathname;
    marketUrl.search = target.search;
    marketUrl.hash = target.hash;
  }
  marketUrl.searchParams.set('ivy-viewer', 'vscode-market');
  return marketUrl;
};

const createMarketContent = (url: URL, title: string): string => {
  const nonce = createNonce();
  return `<!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; frame-src ${url.origin};">
        <style nonce="${nonce}">html, body, iframe { width: 100%; height: 100%; margin: 0; padding: 0; border: 0; } iframe { display: block; }</style>
      </head>
      <body>
        <iframe id="market" title="${title}" src="${url.href}" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
        <script nonce="${nonce}">
          (() => {
            const vscode = acquireVsCodeApi();
            const market = document.getElementById('market');
            const marketOrigin = ${JSON.stringify(url.origin)};
            window.addEventListener('message', ({ source, origin, data }) => {
              if (source === market.contentWindow) {
                if (origin === marketOrigin) vscode.postMessage(data);
                return;
              }
              if (data?.source !== '${VSCODE_SOURCE}') return;
              if (data.type === 'navigate') market.src = data.url;
              else market.contentWindow.postMessage(data, marketOrigin);
            });
          })();
        </script>
      </body>
    </html>`;
};

const createThemeMessage = (theme: ColorThemeKind) => ({
  source: VSCODE_SOURCE,
  type: 'theme',
  theme: theme === ColorThemeKind.Dark || theme === ColorThemeKind.HighContrast ? 'dark' : 'light'
});
