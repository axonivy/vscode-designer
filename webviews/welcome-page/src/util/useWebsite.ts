declare function acquireVsCodeApi(): {
  postMessage: (msg: unknown) => void;
};

type Message = {
  type: string;
  url: string;
};

export const useWebsite = () => {
  let vscode;
  try {
    vscode = acquireVsCodeApi();
  } catch {
    vscode = { postMessage: (message: Message) => window.open(message.url) };
  }

  const openUrl = (url: string) => {
    vscode.postMessage({ type: 'open-external-link', url });
  };

  return { openUrl };
};
