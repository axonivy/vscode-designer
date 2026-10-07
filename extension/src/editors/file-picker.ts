import * as path from 'path';
import type { TextDocument } from 'vscode';
import { l10n, Uri, window } from 'vscode';

type FilePickRequestLike = {
  fileTypes?: Record<string, string[]>;
};

export async function pickFile(request: FilePickRequestLike, document: TextDocument): Promise<string | undefined> {
  if (!request.fileTypes || Object.keys(request.fileTypes).length === 0) {
    return undefined;
  }

  const projectPath = path.dirname(path.dirname(document.uri.fsPath));
  const picked = await window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    defaultUri: Uri.file(projectPath),
    openLabel: l10n.t('Select File'),
    filters: Object.fromEntries(Object.entries(request.fileTypes).map(([label, extensions]) => [localizeFileTypeLabel(label), extensions]))
  });

  const selected = picked?.[0];
  if (!selected) {
    return undefined;
  }

  const relativePath = path.relative(projectPath, selected.fsPath);
  if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
    return relativePath;
  }

  return selected.toString();
}

const localizeFileTypeLabel = (label: string) => {
  switch (label) {
    case 'Project archive':
      return l10n.t('Project archive');
    default:
      return label;
  }
};
