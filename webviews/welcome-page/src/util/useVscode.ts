import type { VsCodeApi } from 'vscode-messenger-webview';
import { useVscodeApi } from './VscodeApiProvider';

export const useVscode = () => {
  const vscodeApi = useVscodeApi();

  const openUrl = (url: string) => {
    vscodeApi.vscode.postMessage({ type: 'open-external-link', url });
  };

  const executeCommand = (command: string) => {
    vscodeApi.vscode.postMessage({ type: 'execute-command', command });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getData = (callback: (value: any) => void) => {
    window.addEventListener('message', event => {
      callback(event.data);
      console.log(event.data);
    });
  };

  return { openUrl, getData, executeCommand };
};

declare function acquireVsCodeApi(): VsCodeApi;

export const getVscodeApi = () => {
  let vscode: VsCodeApi;
  try {
    vscode = acquireVsCodeApi();
  } catch {
    vscode = { postMessage: message => console.log(message) } as VsCodeApi;
  }
  return vscode;
};
