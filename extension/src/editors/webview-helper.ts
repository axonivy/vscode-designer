import { render } from 'dom-serializer';
import { Element, Text } from 'domhandler';
import fs from 'fs';
import { DomUtils, parseDocument } from 'htmlparser2';
import * as vscode from 'vscode';
import { ViteManifestEntry, findEditorWorker, findRootEntry, findRootHtml, parseBuildManifest } from './build-manifest';

export const createWebViewContent = (
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  webviewPath: string,
  customAsset?: (nonce: string, rootEntry: ViteManifestEntry, rootPath: vscode.Uri) => Element
) => {
  const nonce = createNonce();
  const rootPath = vscode.Uri.joinPath(context.extensionUri, 'dist', 'webviews', webviewPath);
  // const pathOf = (path: string) => vscode.Uri.joinPath(rootPath, path);

  const manifest = parseBuildManifest(rootPath);

  // create process editor HTML document from "template"
  const htmlUri = findRootHtml(rootPath, manifest);
  const htmlContent = fs.readFileSync(htmlUri.fsPath, 'utf-8');
  const htmlDoc = parseDocument(htmlContent, { xmlMode: true, decodeEntities: false });
  const head = DomUtils.getElementsByTagName('head', [htmlDoc])[0];
  const body = DomUtils.getElementsByTagName('body', [htmlDoc])[0];
  if (!head || !body) {
    throw new Error('Invalid HTML template, missing head or body element');
  }

  // replace script and style references with webview URI references as otherwise we get an net::ERR_ACCESS_DENIED error
  Array.from(DomUtils.getElementsByTagName('script', htmlDoc)).forEach(DomUtils.removeElement);
  Array.from(DomUtils.getElementsByTagName('link', htmlDoc)).forEach(DomUtils.removeElement);

  // index root script, we skip other scripts as they are loaded dynamically within the application
  const indexScript = new Element('script', {
    src: webview.asWebviewUri(vscode.Uri.joinPath(rootPath, findRootEntry(manifest).chunk.file)).toString(),
    type: 'module',
    async: 'true',
    nonce: nonce
  });
  DomUtils.appendChild(body, indexScript);

  // CSS files
  const webviewCssUris =
    findRootEntry(manifest).chunk.css?.map(relativePath => webview.asWebviewUri(vscode.Uri.joinPath(rootPath, relativePath))) ?? [];
  for (const cssUri of webviewCssUris) {
    const styleLink = new Element('link', {
      href: cssUri.toString(),
      type: 'text/css',
      rel: 'stylesheet'
    });
    DomUtils.appendChild(head, styleLink);
  }

  // script to set the editor worker location, needed to load the editor worker from the webview as it only allows blob: or data: fetching
  const workerUri = findEditorWorker(context.extensionUri);
  if (workerUri) {
    const editorWorkerLocation = webview.asWebviewUri(workerUri);
    const editorWorkerLocationScript = new Element('script', { nonce: nonce }, [
      new Text(`const editorWorkerLocation = "${editorWorkerLocation}";`)
    ]);
    DomUtils.appendChild(head, editorWorkerLocationScript);
  }

  if (customAsset) {
    const asset = customAsset(nonce, findRootEntry(manifest), rootPath);
    DomUtils.appendChild(head, asset);
  }

  // set the content security policy to specify what the webview is allowed to access
  const csp = new Element('meta', {
    httpEquiv: 'Content-Security-Policy',
    content: `
      default-src 'none';
      style-src ${customAsset ? '' : 'unsafe-inline'} ${webview.cspSource};
      img-src ${webview.cspSource} https: data:;
      script-src 'nonce-${nonce}' *;
      worker-src ${webview.cspSource} blob: data:;
      font-src ${webview.cspSource};
      connect-src ${webview.cspSource}`
  });
  DomUtils.appendChild(head, csp);
  return render(htmlDoc, { xmlMode: true, decodeEntities: false, selfClosingTags: false });
};

const createNonce = () => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};
