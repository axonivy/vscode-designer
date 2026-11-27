import path from 'path';
import { l10n, Uri } from 'vscode';
import { IvyProjectManager } from '../../project-explorer/ivy-project-manager';

export const resolveToolProjectPath = async (input: unknown): Promise<string> => {
  const projectPath = typeof input === 'string' ? input : '';
  if (path.isAbsolute(projectPath)) {
    const fsPath = Uri.file(projectPath).fsPath;
    const projects = await IvyProjectManager.instance.getIvyProjects();
    if (projects.includes(fsPath)) {
      return fsPath;
    }
  }
  throw new Error(l10n.t('{0}: Selected project {1} is not a valid Axon Ivy project path.', 'projectPath', projectPath));
};
