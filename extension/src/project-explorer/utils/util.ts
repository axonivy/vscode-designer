import { XMLParser } from 'fast-xml-parser';
import path from 'path';
import type { FileStat } from 'vscode';
import { FileType, Uri, workspace } from 'vscode';

const defaultNamespaceOf = (projecDir: string) => {
  const designerPrefs = Uri.joinPath(Uri.file(projecDir), 'pom.xml');
  return workspace.fs.readFile(designerPrefs).then(
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

export const resolveNamespaceFromPath = async (selectedUri: Uri, projectDir: string, target: ResourceDirectoryTarget) => {
  let fileStat: FileStat;
  try {
    fileStat = await workspace.fs.stat(selectedUri);
  } catch {
    return resolveDefaultNamespace(projectDir, target);
  }
  const selectedPath = fileStat.type === FileType.File ? getDirectory(selectedUri.fsPath, target) : selectedUri.fsPath;
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

export const validateProjectArtifactName = (value: string) => {
  const pattern = /^[\w]+$/;
  if (pattern.test(value)) {
    return;
  }
  return 'Only letters, numbers, and underscores are allowed. No trailing whitespaces.';
};

export const validateProjectName = (value: string) => {
  const pattern = /^[\w-]+$/;
  if (pattern.test(value)) {
    return;
  }
  return 'Only letters, numbers, underscores, and hyphens are allowed. No trailing whitespaces.';
};

export const validateDotSeparatedName = (value: string) => {
  const pattern = /^\w+(\.\w+)*$/;
  if (pattern.test(value)) {
    return;
  }
  return 'Enter Namespace separated by ".". Only letters, numbers, and underscores are allowed. Cannot be empty. No trailing whitespaces. Empty not allowed.';
};
export const validateNamespace = (value: string) => {
  const pattern = /^(\w+(\/\w+)*)?$/;
  if (pattern.test(value)) {
    return;
  }
  return 'Enter Namespace separated by "/". Only letters, numbers, and underscores are allowed. No trailing whitespaces. Empty allowed.';
};
