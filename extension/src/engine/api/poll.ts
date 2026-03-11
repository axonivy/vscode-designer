import axios from 'axios';
import * as vscode from 'vscode';

export async function pollWithProgress(url: string, title: string) {
  const options = {
    location: vscode.ProgressLocation.Notification,
    cancellable: true,
    title
  };
  await vscode.window.withProgress(options, async (progress, token) => {
    progress.report({ message: url });
    while (!token.isCancellationRequested) {
      const status = await axios
        .get(url)
        .then(async response => response.status)
        .catch(() => undefined);
      if (status === 200) {
        return;
      }
      await wait(2000);
    }
    await Promise.reject(`Polling of "${title}" was cancelled.`);
  });
}

const wait = function (ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};
