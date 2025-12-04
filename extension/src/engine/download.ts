import AdmZip from 'adm-zip';
import fs from 'fs';
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
  fs.mkdirSync(path.dirname(enginePath), { recursive: true });
  const zipPath = path.join(rootDir, zipName);
  logger(`Download engine from '${url}' to '${zipPath}'`);
  const fileStream = fs.createWriteStream(zipPath);
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to get reader from response body');
  }
  let downloadedBytes = 0;
  let lastProgressUpdate = Date.now();
  const contentLength = response.headers.get('content-length');
  const formatedContentLength = contentLength ? formatBytes(parseInt(contentLength)) : 'unknown size';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    downloadedBytes += value.length;
    fileStream.write(Buffer.from(value));
    const now = Date.now();
    if (now - lastProgressUpdate > 1000) {
      logger(`Downloaded: ${formatBytes(downloadedBytes)} of ${formatedContentLength}`);
      lastProgressUpdate = now;
    }
  }
  fileStream.end();
  return new Promise<string>(resolve => {
    fileStream.on('finish', () => {
      fileStream.close();
      logger(`--> Download finished - ${formatBytes(downloadedBytes)} downloaded`);
      unzipEngine(zipPath, enginePath, logger);
      resolve(enginePath);
    });
  });
};

const formatBytes = (bytes: number) => {
  return (bytes / Math.pow(1024, 2)).toFixed(2) + ' MB';
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
