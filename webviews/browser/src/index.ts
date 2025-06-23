import DOMPurify from 'dompurify';
import { VsCodeApi } from 'vscode-messenger-webview';

declare function acquireVsCodeApi(): VsCodeApi;
const vscode = acquireVsCodeApi();

const onceDocumentLoaded = (func: () => void) => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', func);
  } else {
    func();
  }
};

const iframe = document.querySelector('iframe');
const header = document.querySelector('.header');
const input = <HTMLInputElement | null>header?.querySelector('.url-input');
const forwardButton = header?.querySelector('.forward-button');
const backButton = header?.querySelector('.back-button');
const reloadButton = header?.querySelector('.reload-button');
const openHomeButton = header?.querySelector('.open-home-button');
const openExternalButton = header?.querySelector('.open-external-button');

window.addEventListener('message', e => {
  switch (e.data.type) {
    case 'focus': {
      iframe?.focus();
      break;
    }
    case 'didChangeFocusLockIndicatorEnabled': {
      toggleFocusLockIndicatorEnabled(e.data.enabled);
      break;
    }
    case 'frame-onload': {
      if (input) input.value = e.data.url;
      break;
    }
    default:
      console.log(`Unknown message event: ${e.data.type}`);
  }
});

onceDocumentLoaded(() => {
  setInterval(() => {
    const iframeFocused = document.activeElement?.tagName === 'IFRAME';
    document.body.classList.toggle('iframe-focused', iframeFocused);
  }, 50);

  input?.addEventListener('change', e => {
    const target = e.target as HTMLTextAreaElement;
    const url = target.value;
    navigateTo(url);
  });

  forwardButton?.addEventListener('click', () => {
    window.history.forward();
  });

  backButton?.addEventListener('click', () => {
    window.history.back();
  });

  openHomeButton?.addEventListener('click', () => {
    vscode.postMessage({ type: 'openHome' });
  });

  openExternalButton?.addEventListener('click', () => {
    vscode.postMessage({
      type: 'openExternal',
      url: input?.value
    });
  });

  reloadButton?.addEventListener('click', () => {
    if (input) navigateTo(input.value);
  });

  const navigateTo = (rawUrl: string) => {
    try {
      const url = new URL(rawUrl);

      // Try to bust the cache for the iframe
      // There does not appear to be any way to reliably do this except modifying the url
      const paramName = 'vscodeBrowserReqId';
      if (url.searchParams.has(paramName)) {
        url.searchParams.delete(paramName);
      } else {
        url.searchParams.append(paramName, Date.now().toString());
      }
      setIframeSrc(url.toString());
    } catch {
      setIframeSrc(rawUrl);
    }
    vscode.setState({ url: rawUrl });
  };
});

const setIframeSrc = (url: string) => {
  if (iframe) iframe.src = DOMPurify.sanitize(url);
};

const toggleFocusLockIndicatorEnabled = (enabled: boolean) => {
  document.body.classList.toggle('enable-focus-lock-indicator', enabled);
};
