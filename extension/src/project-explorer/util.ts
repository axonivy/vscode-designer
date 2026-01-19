import { XMLParser } from 'fast-xml-parser';
import path from 'path';
import * as vscode from 'vscode';

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
  const selectedPath = fileStat.type === vscode.FileType.File ? getDirectory(selectedUri.path, target) : selectedUri.path;
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

export const validateArtifactName = (value: string) => {
  const pattern = /^[\w-]+$/;
  if (pattern.test(value)) {
    return;
  }
  return 'Invalid name.';
};

export const validateDotSeparatedName = (value: string, errorMessage = 'Invalid namespace.') => {
  const pattern = /^\w+(\.\w+)*(-\w+)*$/;
  if (pattern.test(value)) {
    return;
  }
  return errorMessage;
};
