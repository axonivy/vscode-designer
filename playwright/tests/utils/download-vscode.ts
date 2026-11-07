import { downloadAndUnzipVSCode } from '@vscode/test-electron';

const VSCODE_VERSION = '1.145.2';

export const runDownloadAndUnzipVSCode = async () => {
  return await downloadAndUnzipVSCode({ version: VSCODE_VERSION });
};
