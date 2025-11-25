declare function acquireVsCodeApi(): {
  postMessage: (msg: unknown) => void;
};

type Message = {
  type: string;
  url: string;
};

export const useVscode = () => {
  let vscode;
  try {
    vscode = acquireVsCodeApi();
  } catch {
    vscode = { postMessage: (message: Message) => window.open(message.url) };
  }

  const openUrl = (url: string) => {
    vscode.postMessage({ type: 'open-external-link', url });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getData = (callback: (value: any) => void) => {
    window.addEventListener('message', event => {
      callback(event.data);
      console.log(event.data);
    });
  };

  return { openUrl, getData };
};
