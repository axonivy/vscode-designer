import { createContext, use, type ReactNode } from 'react';
import { Messenger, type VsCodeApi } from 'vscode-messenger-webview';

const Context = createContext<Messenger | undefined>(undefined);

export const VscodeMessengerProvider = ({ children, messenger }: { children: ReactNode; messenger: Messenger }) => {
  return <Context value={messenger}>{children}</Context>;
};

export const useMessenger = () => {
  const messenger = use(Context);
  if (!messenger) {
    throw new Error('useMessenger must be used within an VscodeMessengerProvider');
  }
  return { messenger };
};

declare function acquireVsCodeApi(): VsCodeApi;

export const getMessenger = () => {
  let vscodeApi: VsCodeApi;
  try {
    vscodeApi = acquireVsCodeApi();
  } catch {
    vscodeApi = {} as VsCodeApi;
  }
  const messenger = new Messenger(vscodeApi);
  messenger.start();
  return messenger;
};
