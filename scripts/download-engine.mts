import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

function downloadEngine() {
  const engineDonwloadUrl = process.argv[2]
    ? process.argv[2]
    : 'https://jenkins.ivyteam.io/job/core_product-engine/job/master/lastSuccessfulBuild/artifact/workspace/ch.ivyteam.ivy.server.product/target/products/*_Slim_*.zip/*zip*/products.zip';

  const engineDir = 'extension/AxonIvyEngine';
  if (fs.existsSync(engineDir)) {
    fs.rmSync(engineDir, { recursive: true, force: true });
  }
  fs.mkdirSync(engineDir);
  downloadEngineReq(engineDir, engineDonwloadUrl);
}

function downloadEngineReq(engineDir: string, downloadUrl: string) {
  const filename = path.join(engineDir, path.basename(downloadUrl));
  console.log(`Download engine from '${downloadUrl}' to '${filename}'`);

  var requestInit: RequestInit = {};
  fetch(downloadUrl, requestInit).then(response => {
    if (!response.ok) {
      console.error(`--> Download engine failed with status code ${response.status}`);
      return;
    }
    const fileStream = fs.createWriteStream(filename);
    Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(fileStream);
    fileStream.on('finish', () => {
      fileStream.close();
      console.log('--> Download finished');
      unzipEngine(filename, engineDir);
    });
  });
}

async function unzipEngine(zipName: string, targetDir: string) {
  console.log(`Extract '${zipName}' to '${targetDir}'`);
  var zip = new AdmZip(zipName);
  zip.extractAllTo(targetDir, true, true);
  fs.rmSync(zipName);

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
  console.log('--> Extract finished');
  addDevModeSystemProperty(targetDir);
}

function addDevModeSystemProperty(targetDir: string) {
  const config = path.join(targetDir, 'configuration');
  const jvmOptionsFile = path.join(targetDir, 'configuration', 'jvm.options');
  console.log(`Add '-Ddev.mode=true' option to jvmOptions file '${jvmOptionsFile}'`);
  if (fs.existsSync(jvmOptionsFile)) {
    const jvmOptions = fs.readFileSync(jvmOptionsFile, 'utf8');
    if (!jvmOptions.includes('-Ddev.mode=true')) {
      fs.appendFileSync(jvmOptionsFile, '\n-Ddev.mode=true');
    }
  }
}

downloadEngine();
