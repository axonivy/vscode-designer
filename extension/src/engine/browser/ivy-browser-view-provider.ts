import { executeCommand } from '../../base/commands';
import * as vscode from 'vscode';

export class IvyBrowserViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ivyBrowserView';

  private view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri, private url: string) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this.view = webviewView;
    webviewView.webview.options = { enableForms: true, enableScripts: true };
    webviewView.webview.html = this.getWebviewContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(e => {
      switch (e.type) {
        case 'openExternal':
          try {
            const url = vscode.Uri.parse(e.url);
            vscode.env.openExternal(url);
          } catch {
            vscode.window.showErrorMessage(`Couldn't open uri '${e.url}' in external browser.`);
          }
          break;
        case 'openHome':
          executeCommand('engine.openDevWfUi');
          break;
      }
    });
  }

  public refreshWebviewHtml(url: string) {
    this.url = url;
    if (!this.view) {
      return;
    }
    this.view.webview.html = this.getWebviewContent(this.view.webview);
  }

  private getWebviewContent(webview: vscode.Webview) {
    const browserCss = this.extensionResourceUrl(webview, 'src', 'engine', 'browser', 'media', 'browser.css');
    const mainJs = this.extensionResourceUrl(webview, 'src', 'engine', 'browser', 'media', 'index.js');
    const nonce = getNonce();
    return `<!DOCTYPE html>
    <html>
    <head>
      <meta http-equiv="Content-type" content="text/html;charset=UTF-8">
      <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        font-src data:;
        style-src ${webview.cspSource};
        script-src 'nonce-${nonce}';
        frame-src *;
        ">
      <link rel="stylesheet" type="text/css" href="${browserCss}">
    </head>
    <body>
      <header class="header">
        <nav class="controls">
          <button
            title="${vscode.l10n.t('Back')}"
            class="back-button icon">
            <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 3.093l-5 5V8.8l5 5 .707-.707-4.146-4.147H14v-1H3.56L7.708 3.8 7 3.093z"/></svg>
          </button>

          <button
            title="${vscode.l10n.t('Forward')}"
            class="forward-button icon">
            <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M9 13.887l5-5V8.18l-5-5-.707.707 4.146 4.147H2v1h10.44L8.292 13.18l.707.707z"/></svg>
          </button>

          <button
            title="${vscode.l10n.t('Reload')}"
            class="reload-button icon">
            <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M4.681 3H2V2h3.5l.5.5V6H5V4a5 5 0 1 0 4.53-.761l.302-.954A6 6 0 1 1 4.681 3z"/></svg>
          </button>
        </nav>

        <input class="url-input" type="text" value=${this.url}>

        <nav class="controls">
          <button
            title="${vscode.l10n.t('Open Home')}"
            class="open-home-button icon">
            <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.36 1.37l6.36 5.8-.71.71L13 6.964v6.526l-.5.5h-3l-.5-.5v-3.5H7v3.5l-.5.5h-3l-.5-.5V6.972L2 7.88l-.71-.71 6.35-5.8h.72zM4 6.063v6.927h2v-3.5l.5-.5h3l.5.5v3.5h2V6.057L8 2.43 4 6.063z"/></svg>          </button>
          <button
            title="${vscode.l10n.t('Open in browser')}"
            class="open-external-button icon">
            <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M1.5 1H6v1H2v12h12v-4h1v4.5l-.5.5h-13l-.5-.5v-13l.5-.5z"/><path d="M15 1.5V8h-1V2.707L7.243 9.465l-.707-.708L13.293 2H8V1h6.5l.5.5z"/></svg>
          </button>
        </nav>
      </header>
      <div class="content">
        <iframe src="${this.url}" sandbox="allow-scripts allow-forms allow-same-origin allow-downloads"></iframe>
      </div>
      <script src="${mainJs}" nonce="${nonce}"></script>
    </body>
    </html>`;
  }

  private extensionResourceUrl(webview: vscode.Webview, ...pathSegments: string[]): vscode.Uri {
    return webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, ...pathSegments));
  }

  openInExternalBrowser() {
    vscode.env.openExternal(vscode.Uri.parse(this.url));
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
