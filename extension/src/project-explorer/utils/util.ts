import { XMLParser } from 'fast-xml-parser';
import path from 'path';
import * as vscode from 'vscode';

export type ValidationFunction = (input: string, errorMessage?: string) => string | undefined;

const defaultNamespaceOf = (projecDir: string) => {
  const designerPrefs = vscode.Uri.joinPath(vscode.Uri.file(projecDir), 'pom.xml');
  return vscode.workspace.fs.readFile(designerPrefs).then(
    content => {
      const pom = new XMLParser().parse(content);
      if (pom.project && pom.project.groupId) {
        return `${pom.project.groupId}`;
      }
      return '';
    },
    () => ''
  );
};

type ResourceDirectoryTarget = 'processes' | 'src_hd' | 'dataclasses';

export const resolveNamespaceFromPath = async (selectedUri: vscode.Uri, projectDir: string, target: ResourceDirectoryTarget) => {
  let fileStat: vscode.FileStat;
  try {
    fileStat = await vscode.workspace.fs.stat(selectedUri);
  } catch {
    return resolveDefaultNamespace(projectDir, target);
  }
  const selectedPath = fileStat.type === vscode.FileType.File ? getDirectory(selectedUri.fsPath, target) : selectedUri.fsPath;
  const targetDir = path.join(projectDir, target);
  if (!selectedPath.includes(targetDir)) {
    return resolveDefaultNamespace(projectDir, target);
  }

  const pattern = target === 'processes' ? /(^\/*|\/*$)/g : /(^\.*|\.*$)/g;
  return selectedPath
    .replaceAll(targetDir, '')
    .replaceAll(path.sep, target === 'processes' ? '/' : '.')
    .replaceAll(pattern, '');
};

const getDirectory = (filePath: string, target: ResourceDirectoryTarget) => {
  let directory = path.dirname(filePath);
  if (target === 'src_hd') {
    directory = path.dirname(directory);
  }
  return directory;
};

export const resolveDefaultNamespace = async (projectDir: string, target: ResourceDirectoryTarget) => {
  const defaultNamespace = (await defaultNamespaceOf(projectDir)).replaceAll('-', '.');
  return target === 'processes' ? defaultNamespace.replaceAll('.', '/') : defaultNamespace;
};

export const validateArtifactName: ValidationFunction = (
  value: string,
  errorMessage = 'Only letters, numbers, underscores, and hyphens are allowed. No trailing whitespaces.'
) => {
  const pattern = /^[\w-]+$/;
  if (pattern.test(value)) {
    return;
  }
  return errorMessage;
};

export const validateDotSeparatedName: ValidationFunction = (
  value: string,
  errorMessage = 'Enter Namespace separated by ".". Only letters, numbers, underscores, and hyphens are allowed. No hyphen except for last group'
) => {
  const pattern = /^\w+(\.\w+)*(-\w+)*$/;
  if (pattern.test(value)) {
    return;
  }
  return errorMessage;
};
export const validateNamespace = (
  value: string,
  errorMessage = 'Enter Namespace separated by "/". Only letters, numbers, underscores, and hyphens are allowed. No hyphen except for last group'
) => {
  const pattern = /^(\w+(\/\w+)*(-\w+)*)?$/;
  if (pattern.test(value)) {
    return;
  }
  return errorMessage;
};
