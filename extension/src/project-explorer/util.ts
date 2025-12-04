import path from 'path';
import * as vscode from 'vscode';

const namespaceKey = '\\:DEFAULT_NAMESPACE=';

const defaultNamespaceOf = (projecDir: string) => {
  const designerPrefs = vscode.Uri.joinPath(vscode.Uri.file(projecDir), '.settings', 'ch.ivyteam.ivy.designer.prefs');
  return vscode.workspace.fs.readFile(designerPrefs).then(
    content => {
      const nameSpaceLine =
        content
          .toString()
          .split(/\r?\n/)
          .find(e => e.includes(namespaceKey)) ?? '';
      return nameSpaceLine.substring(nameSpaceLine.indexOf(namespaceKey) + namespaceKey.length);
    },
    () => ''
  );
};

export const resolveNamespaceFromPath = async (
  selectedUri: vscode.Uri,
  projectDir: string,
  target: 'processes' | 'src_hd' | 'dataclasses'
) => {
  const fileStat = await vscode.workspace.fs.stat(selectedUri);
  const selectedPath = fileStat.type === vscode.FileType.File ? path.dirname(selectedUri.path) : selectedUri.path;
  const targetDir = path.join(projectDir, target);
  if (selectedPath.includes(targetDir)) {
    const pattern = target === 'processes' ? /(^\/*|\/*$)/g : /(^\.*|\.*$)/g;
    return selectedPath
      .replaceAll(targetDir, '')
      .replaceAll(path.sep, target === 'processes' ? '/' : '.')
      .replaceAll(pattern, '');
  }
  const defaultNamespace = await defaultNamespaceOf(projectDir);
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
