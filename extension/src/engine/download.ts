import AdmZip from 'adm-zip';
import { once } from 'events';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { ReadableStream as NodeReadableStream } from 'stream/web';

export const downloadEngine = async (url: string, rootDir: string, logger: (message: string) => void, engineDir?: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Download engine failed with status code ${response.status}`);
  }
  if (!response.body) {
    throw new Error('Failed to get reader from response body');
  }
  const zipName = path.basename(response.url);
  const enginePath = engineDir ? path.join(rootDir, engineDir) : path.join(rootDir, zipName.replace('.zip', ''));
  let source: Readable | undefined;
  let downloadDir: string | undefined;
  let downloadedBytes = 0;
  let lastProgressUpdate = Date.now();
  const contentLength = response.headers.get('content-length');
  const formatedContentLength = contentLength ? formatBytes(parseInt(contentLength)) : 'unknown size';

  try {
    fs.mkdirSync(rootDir, { recursive: true });
    fs.mkdirSync(path.dirname(enginePath), { recursive: true });
    downloadDir = fs.mkdtempSync(path.join(rootDir, '.engine-download-'));
    const zipPath = path.join(downloadDir, zipName);
    logger(`Download engine from '${url}' to '${zipPath}'`);
    const reader = response.body.getReader();
    source = Readable.fromWeb(
      new NodeReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const { value, done } = await reader.read();
            if (done) {
              reader.releaseLock();
              controller.close();
            } else {
              controller.enqueue(value);
            }
          } catch (error) {
            reader.releaseLock();
            controller.error(error);
          }
        },
        async cancel(reason) {
          try {
            await reader.cancel(reason);
          } finally {
            reader.releaseLock();
          }
        }
      })
    );
    await pipeline(
      source,
      async function* (chunks: AsyncIterable<Uint8Array>) {
        for await (const chunk of chunks) {
          downloadedBytes += chunk.length;
          const now = Date.now();
          if (now - lastProgressUpdate > 1000) {
            logger(`Downloaded: ${formatBytes(downloadedBytes)} of ${formatedContentLength}`);
            lastProgressUpdate = now;
          }
          yield chunk;
        }
      },
      fs.createWriteStream(zipPath)
    );
    logger(`--> Download finished - ${formatBytes(downloadedBytes)} downloaded`);
    unzipEngine(zipPath, enginePath, logger);
    fs.rmSync(downloadDir, { recursive: true, force: true });
    return enginePath;
  } catch (error) {
    try {
      try {
        if (source && !source.closed) {
          const closed = once(source, 'close');
          source.destroy();
          await closed;
        } else if (!source) {
          await response.body.cancel();
        }
      } finally {
        if (downloadDir) {
          fs.rmSync(downloadDir, { recursive: true, force: true });
        }
      }
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Engine download failed and its resources could not be cleaned up', {
        cause: cleanupError
      });
    }
    throw error;
  } finally {
    source?.destroy();
  }
};

const formatBytes = (bytes: number) => {
  return (bytes / Math.pow(1024, 2)).toFixed(2) + ' MB';
};

const unzipEngine = (zipPath: string, targetDir: string, logger: (message: string) => void) => {
  logger(`Extract '${zipPath}' to '${targetDir}'`);
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(targetDir, true, true);
  fs.rmSync(zipPath);
  logger('--> Extract finished');
};
