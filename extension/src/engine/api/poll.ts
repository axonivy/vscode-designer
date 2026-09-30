import { setTimeout as wait } from 'node:timers/promises';
import { ProgressLocation, window } from 'vscode';
import { extensionLogOutputChannel } from '../../base/extension-output-channel';

export async function pollWithProgress(url: string, title: string) {
  const options = {
    location: ProgressLocation.Notification,
    cancellable: true,
    title
  };
  await window.withProgress(options, async (progress, token) => {
    progress.report({ message: url });
    const controller = new AbortController();
    const cancellation = token.onCancellationRequested(() => controller.abort());
    try {
      while (!token.isCancellationRequested) {
        let ready = false;
        try {
          const response = await fetch(url, { signal: controller.signal });
          ready = response.status === 200;
          await response.body?.cancel();
        } catch (error) {
          if (controller.signal.aborted) {
            throw error;
          }
          extensionLogOutputChannel.debug(`Engine readiness probe failed: ${url}`, error);
        }
        if (ready) {
          return;
        }
        await wait(2000, undefined, { signal: controller.signal });
      }
    } catch (error) {
      if (!token.isCancellationRequested) {
        throw error;
      }
    } finally {
      cancellation.dispose();
    }
    throw `Polling of "${title}" was cancelled.`;
  });
}
