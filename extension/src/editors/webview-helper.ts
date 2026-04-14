import { render } from 'dom-serializer';
import { Element, Text } from 'domhandler';
import fs from 'fs';
import { DomUtils, parseDocument } from 'htmlparser2';
import type { ExtensionContext, Webview } from 'vscode';
import { Uri } from 'vscode';
import { findEditorWorker, findRootEntry, findRootHtml, parseBuildManifest, type ViteManifestEntry } from './build-manifest';

export const createWebViewContent = (
  context: ExtensionContext,
  webview: Webview,
  webviewPath: string,
  customAsset?: (nonce: string, rootEntry: ViteManifestEntry, rootPath: Uri) => Element
) => {
  const nonce = createNonce();
  const rootPath = Uri.joinPath(context.extensionUri, 'dist', 'webviews', webviewPath);
  const manifest = parseBuildManifest(rootPath);
  const rootEntry = findRootEntry(manifest);

  // create process editor HTML document from "template"
  const htmlUri = findRootHtml(rootPath, manifest);
  const htmlContent = fs.readFileSync(htmlUri.fsPath, 'utf-8');
  const htmlDoc = parseDocument(htmlContent, { xmlMode: true, decodeEntities: false });
  const head = DomUtils.getElementsByTagName('head', [htmlDoc])[0];
  const body = DomUtils.getElementsByTagName('body', [htmlDoc])[0];
  if (!head || !body) {
    throw new Error('Invalid HTML template, missing head or body element');
  }

  const templateScripts = Array.from(DomUtils.getElementsByTagName('script', htmlDoc));
  const templateStyleLinks = Array.from(DomUtils.getElementsByTagName('link', htmlDoc)).filter(link => link.attribs.rel === 'stylesheet');

  // replace script and style references with webview URI references as otherwise we get an net::ERR_ACCESS_DENIED error
  templateScripts.forEach(DomUtils.removeElement);
  Array.from(DomUtils.getElementsByTagName('link', htmlDoc)).forEach(DomUtils.removeElement);

  // set the content security policy to specify what the webview is allowed to access
  const csp = new Element('meta', {
    'http-equiv': 'Content-Security-Policy',
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

  // index root script, we skip other scripts as they are loaded dynamically within the application
  const templateRootScript =
    templateScripts.find(script => script.attribs.src?.endsWith(rootEntry.chunk.file)) ??
    templateScripts.find(script => script.attribs.src);
  const indexScript = new Element('script', {
    ...(templateRootScript?.attribs ?? {}),
    src: webview.asWebviewUri(Uri.joinPath(rootPath, rootEntry.chunk.file)).toString(),
    nonce: nonce
  });
  DomUtils.appendChild(body, indexScript);

  // CSS files
  const webviewCssPaths = rootEntry.chunk.css ?? [];
  for (const relativePath of webviewCssPaths) {
    const templateStyleLink = templateStyleLinks.find(link => link.attribs.href?.endsWith(relativePath));
    const styleLink = new Element('link', {
      ...(templateStyleLink?.attribs ?? {}),
      href: webview.asWebviewUri(Uri.joinPath(rootPath, relativePath)).toString()
    });
    DomUtils.appendChild(head, styleLink);
  }

  // script to set the editor worker location, needed to load the editor worker from the webview as it only allows blob: or data: fetching
  const workerUri = findEditorWorker(rootPath);
  if (workerUri) {
    const editorWorkerLocation = webview.asWebviewUri(workerUri);
    const editorWorkerLocationScript = new Element('script', { nonce: nonce }, [
      new Text(`const editorWorkerLocation = "${editorWorkerLocation}";`)
    ]);
    DomUtils.appendChild(head, editorWorkerLocationScript);
  }

  if (customAsset) {
    const asset = customAsset(nonce, rootEntry, rootPath);
    DomUtils.appendChild(head, asset);
  }
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
