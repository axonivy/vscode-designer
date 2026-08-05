import fs from 'fs';
import path from 'path';
import { commands, Uri, window } from 'vscode';
import { validateProjectName } from './utils/util';

export const exportIvyProject = async (projectPath: string) => {
  const projectPomPath = path.join(projectPath, 'pom.xml');
  if (!fs.existsSync(projectPomPath)) {
    throw new Error(`Export Axon Ivy Project: No pom.xml found in the root of the selected project path: ${projectPath}`);
  }

  let outputPath: string;
  while (true) {
    const outputFolder = await window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      title: 'Select output folder',
      openLabel: 'Select output folder'
    });
    if (!outputFolder || outputFolder.length === 0 || !outputFolder[0]) {
      return undefined;
    }
    const outputFolderUri: Uri = outputFolder[0];
    if (!outputFolderUri) {
      return undefined;
    }

    const outputFileName = await window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: 'my-project-export',
      prompt: 'Enter the output file name (without .iar extension)',
      title: 'Export Axon Ivy Project',
      validateInput: (value: string) => {
        return validateOutputFileName(value, outputFolderUri, '.iar');
      }
    });

    outputPath = path.join(outputFolderUri.fsPath, `${outputFileName}.iar`);
    break;
  }

  console.log(outputPath);

  try {
    await commands.executeCommand('maven.goal.package', { pomPath: projectPomPath });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Axon Ivy Export Error - Failed to execute Maven package goal. Error: ${message}`,
      error instanceof Error ? { cause: error } : undefined
    );
  }
};

const validateOutputFileName = (fileName: string, folderPath: Uri, extension: string): string | undefined => {
  const nameValid = validateProjectName(fileName);
  if (nameValid !== undefined) {
    return nameValid;
  }
  const filePath = path.join(folderPath.fsPath, `${fileName}${extension}`);
  if (fs.existsSync(filePath)) {
    return `File already exists: ${filePath}`;
  }
  return undefined;
};
