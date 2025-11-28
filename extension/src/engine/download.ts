import AdmZip from 'adm-zip';
import fs from 'fs';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import path from 'path';

export const downloadEngine = async (url: string, rootDir: string, logger: (message: string) => void, engineDir?: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    return Promise.reject(`Download engine failed with status code ${response.status}`);
  }
  const zipName = path.basename(response.url);
  const enginePath = engineDir ? path.join(rootDir, engineDir) : path.join(rootDir, zipName.replace('.zip', ''));
  if (fs.existsSync(enginePath)) {
    logger(`Engine does already exist under '${enginePath}'`);
    return enginePath;
  }
  fs.mkdirSync(enginePath, { recursive: true });
  const zipPath = path.join(rootDir, zipName);
  logger(`Download engine from '${url}' to '${zipPath}'`);
  const fileStream = fs.createWriteStream(zipPath);
  Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(fileStream);
  return new Promise<string>(resolve => {
    fileStream.on('finish', () => {
      fileStream.close();
      logger('--> Download finished');
      unzipEngine(zipPath, enginePath, logger);
      resolve(enginePath);
    });
  });
};

const unzipEngine = (zipPath: string, targetDir: string, logger: (message: string) => void) => {
  logger(`Extract '${zipPath}' to '${targetDir}'`);
  let zip = new AdmZip(zipPath);
  zip.extractAllTo(targetDir, true, true);
  fs.rmSync(zipPath);

  const files = fs.readdirSync(targetDir);
  files.forEach(file => {
    const nestedZipName = path.join(targetDir, file);
    if (nestedZipName.endsWith('.zip') && fs.existsSync(nestedZipName)) {
      zip = new AdmZip(nestedZipName);
      zip.extractAllTo(targetDir, true, true);
      fs.rmSync(nestedZipName);
      return;
    }
  });
  logger('--> Extract finished');
};
