import axios from 'axios';
import { l10n, ProgressLocation, window } from 'vscode';

export async function pollWithProgress(url: string, title: string) {
  const options = {
    location: ProgressLocation.Notification,
    cancellable: true,
    title
  };
  await window.withProgress(options, async (progress, token) => {
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
    await Promise.reject(l10n.t('Polling of "{0}" was cancelled.', title));
  });
}

const wait = function (ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};
