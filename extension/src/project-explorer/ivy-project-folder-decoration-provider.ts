import {
  type CancellationToken,
  EventEmitter,
  FileDecoration,
  type FileDecorationProvider,
  type FileStat,
  FileType,
  Uri,
  workspace
} from 'vscode';

const markerFileName = '.ivyproject';

export class MarkerFolderDecorationProvider implements FileDecorationProvider {
  private readonly changedEmitter = new EventEmitter<Uri | Uri[]>();

  readonly onDidChangeFileDecorations = this.changedEmitter.event;

  private readonly resultCache = new Map<string, boolean>();

  async provideFileDecoration(uri: Uri, token: CancellationToken): Promise<FileDecoration | undefined> {
    if (token.isCancellationRequested) {
      return undefined;
    }

    // Only decorate directories.
    let stat: FileStat;

    try {
      stat = await workspace.fs.stat(uri);
    } catch {
      return undefined;
    }

    if ((stat.type & FileType.Directory) === 0) {
      return undefined;
    }

    const containsMarker = await this.hasMarkerFile(uri);

    if (!containsMarker) {
      return undefined;
    }

    return {
      badge: 'A',
      tooltip: `Contains ${markerFileName}`
    };
  }

  private async hasMarkerFile(folder: Uri): Promise<boolean> {
    const key = folder.toString();
    const cached = this.resultCache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const markerUri = Uri.joinPath(folder, markerFileName);

    try {
      const stat = await workspace.fs.stat(markerUri);
      const exists = (stat.type & FileType.File) !== 0;

      this.resultCache.set(key, exists);
      return exists;
    } catch {
      this.resultCache.set(key, false);
      return false;
    }
  }

  invalidateAncestors(uris: readonly Uri[]) {
    const affectedFolders = new Set<string>();

    for (const uri of uris) {
      let folder = uri;

      // For a changed file, start with its parent directory.
      folder = Uri.joinPath(folder, '..');

      while (folder.fsPath.length > 0) {
        affectedFolders.add(folder.toString());

        const parent = Uri.joinPath(folder, '..');

        if (parent.toString() === folder.toString()) {
          break;
        }

        folder = parent;
      }
    }

    const affectedUris = [...affectedFolders].map(value => Uri.parse(value));

    for (const uri of affectedUris) {
      this.resultCache.delete(uri.toString());
    }

    if (affectedUris.length > 0) {
      this.changedEmitter.fire(affectedUris);
    }
  }
}
