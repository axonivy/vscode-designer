import { createContext, useContext, useState, type ReactNode } from 'react';
import type { VsCodeApi } from 'vscode-messenger-webview';

const Context = createContext<VsCodeApi | undefined>(undefined);

export const VscodeApiProvider = ({ vscodeApi, children }: { vscodeApi: VsCodeApi; children: ReactNode }) => {
  const [vscode] = useState<VsCodeApi>(vscodeApi);
  return <Context.Provider value={vscode}>{children}</Context.Provider>;
};

export const useVscodeApi = () => {
  const vscode = useContext(Context);
  if (!vscode) {
    throw new Error('useVscodeApi must be used within an VscodeApiProvider');
  }

  return { vscode };
};
