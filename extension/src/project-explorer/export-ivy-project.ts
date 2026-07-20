import fs from 'fs';
import path from 'path';
import { commands, window } from 'vscode';

export const exportIvyProject = async (projectPath: string) => {
  const projectPomPath = path.join(projectPath, 'pom.xml');
  if (!fs.existsSync(projectPomPath)) {
    throw new Error(`Export Axon Ivy Project: No pom.xml found in the root of the selected project path: ${projectPath}`);
  }
  const outputPath = await window.showOpenDialog({
    canSelectFolders: true,
    canSelectMany: false,
    title: 'Select output folder for exported Axon Ivy Project',
    openLabel: 'Export to .iar'
  });
  if (!outputPath || outputPath.length === 0 || !outputPath[0]) {
    return undefined;
  }
  try {
    await commands.executeCommand('maven.goal.package', { pomPath: projectPomPath });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Export Axon Ivy Project: Failed to execute Maven package goal. Error: ${message}`,
      error instanceof Error ? { cause: error } : undefined
    );
  }
  // TODO: Find the output path of the generated .iar file and copy to outputPath
};
