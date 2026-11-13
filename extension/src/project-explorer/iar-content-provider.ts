import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import {
  Disposable,
  EventEmitter,
  FileSystemError,
  FileType,
  Uri,
  type FileChangeEvent,
  type FileStat,
  type FileSystemProvider
} from 'vscode';

export const IAR_CONTENT_SCHEME = 'axonivy-iar-content';
const IVY_CONTENT_PATH = 'META-INF/ivy';

const resolveIarContentUri = (uri: Uri) => {
  const archivePath = new URLSearchParams(uri.query).get('archive');
  if (!archivePath) {
    throw FileSystemError.FileNotFound(uri);
  }
  const segments = uri.path.split('/').filter(Boolean).slice(1);
  if (segments.some(segment => segment === '..' || segment === '.' || segment.includes('\\') || segment.includes('\0'))) {
    throw FileSystemError.NoPermissions(uri);
  }
  const relativePath = segments.join('/');
  const entryPath = relativePath ? path.posix.join(IVY_CONTENT_PATH, relativePath) : IVY_CONTENT_PATH;
  return { archivePath, entryPath };
};

export const iarContentEngineFileName = (uri: Uri) => {
  const { archivePath, entryPath } = resolveIarContentUri(uri);
  return `${archivePath}!/${entryPath}`;
};

export const iarContentUri = (archivePath: string, entryPath: string) => {
  const contentPath = entryPath.replace(/^META-INF\/ivy\/?/, '');
  const uriPath = [path.basename(archivePath), ...contentPath.split('/').filter(Boolean)]
    .map(segment => encodeURIComponent(segment))
    .join('/');
  const query = new URLSearchParams({ archive: archivePath });
  return Uri.parse(`${IAR_CONTENT_SCHEME}:/${uriPath}?${query.toString()}`);
};

export class IarContentFileSystemProvider implements FileSystemProvider {
  private readonly onDidChangeFileEmitter = new EventEmitter<FileChangeEvent[]>();
  readonly onDidChangeFile = this.onDidChangeFileEmitter.event;
  private readonly archives = new Map<string, { archive: AdmZip; mtime: number; ctime: number; size: number }>();

  watch() {
    return new Disposable(() => undefined);
  }

  refresh() {
    this.archives.clear();
  }

  dispose() {
    this.refresh();
    this.onDidChangeFileEmitter.dispose();
  }

  stat(uri: Uri): FileStat {
    const { archivePath, entryPath } = this.resolveUri(uri);
    const localPath = this.localPath(archivePath, entryPath);
    if (localPath) {
      try {
        const stat = fs.statSync(localPath);
        return {
          type: stat.isDirectory() ? FileType.Directory : FileType.File,
          ctime: stat.birthtimeMs,
          mtime: stat.mtimeMs,
          size: stat.size
        };
      } catch {
        throw FileSystemError.FileNotFound(uri);
      }
    }

    const archive = this.getArchive(archivePath);
    const normalizedPath = entryPath.replace(/\/$/, '');
    const archiveEntry = archive.getEntry(normalizedPath) ?? archive.getEntry(`${normalizedPath}/`);
    if (archiveEntry && !archiveEntry.isDirectory) {
      const mtime = this.archiveMtime(archivePath);
      return { type: FileType.File, ctime: mtime, mtime, size: archiveEntry.header.size };
    }
    const isDirectory = archiveEntry?.isDirectory || archive.getEntries().some(entry => entry.entryName.startsWith(`${normalizedPath}/`));
    if (isDirectory) {
      const mtime = this.archiveMtime(archivePath);
      return { type: FileType.Directory, ctime: mtime, mtime, size: 0 };
    }
    throw FileSystemError.FileNotFound(uri);
  }

  readDirectory(uri: Uri): [string, FileType][] {
    const { archivePath, entryPath } = this.resolveUri(uri);
    if (this.stat(uri).type !== FileType.Directory) {
      throw FileSystemError.FileNotADirectory(uri);
    }
    const localPath = this.localPath(archivePath, entryPath);
    if (localPath) {
      try {
        return fs
          .readdirSync(localPath, { withFileTypes: true })
          .filter(entry => entry.isDirectory() || entry.isFile())
          .map(entry => [entry.name, entry.isDirectory() ? FileType.Directory : FileType.File]);
      } catch {
        throw FileSystemError.FileNotFound(uri);
      }
    }

    const prefix = `${entryPath.replace(/\/$/, '')}/`;
    const children = new Map<string, FileType>();
    for (const entry of this.getArchive(archivePath).getEntries()) {
      if (!entry.entryName.startsWith(prefix)) {
        continue;
      }
      const [name, ...remainingPath] = entry.entryName.slice(prefix.length).split('/').filter(Boolean);
      if (!name) {
        continue;
      }
      const type = entry.isDirectory || remainingPath.length > 0 ? FileType.Directory : FileType.File;
      if (type === FileType.Directory || !children.has(name)) {
        children.set(name, type);
      }
    }
    return [...children.entries()];
  }

  readFile(uri: Uri): Uint8Array {
    if (this.stat(uri).type === FileType.Directory) {
      throw FileSystemError.FileIsADirectory(uri);
    }
    const { archivePath, entryPath } = this.resolveUri(uri);
    const localPath = this.localPath(archivePath, entryPath);
    if (localPath) {
      try {
        return fs.readFileSync(localPath);
      } catch (error) {
        if (error instanceof FileSystemError) {
          throw error;
        }
        throw FileSystemError.FileNotFound(uri);
      }
    }

    const archiveEntry = this.getArchive(archivePath).getEntry(entryPath);
    if (!archiveEntry) {
      throw FileSystemError.FileNotFound(uri);
    }
    if (archiveEntry.isDirectory) {
      throw FileSystemError.FileIsADirectory(uri);
    }
    return archiveEntry.getData();
  }

  createDirectory(uri: Uri): void {
    throw FileSystemError.NoPermissions(uri);
  }

  writeFile(uri: Uri): void {
    throw FileSystemError.NoPermissions(uri);
  }

  delete(uri: Uri): void {
    throw FileSystemError.NoPermissions(uri);
  }

  rename(oldUri: Uri): void {
    throw FileSystemError.NoPermissions(oldUri);
  }

  tranformToAbsoluteUri(uri: Uri) {
    return Uri.parse(iarContentEngineFileName(uri));
  }

  private resolveUri(uri: Uri) {
    return resolveIarContentUri(uri);
  }

  private localPath(archivePath: string, entryPath: string) {
    let isDirectory: boolean;
    try {
      isDirectory = fs.statSync(archivePath).isDirectory();
    } catch {
      throw FileSystemError.FileNotFound(archivePath);
    }
    if (!isDirectory) {
      return undefined;
    }
    let contentRoot: string;
    let resolvedPath: string;
    try {
      contentRoot = fs.realpathSync(path.join(archivePath, IVY_CONTENT_PATH));
      resolvedPath = fs.realpathSync(path.join(archivePath, ...entryPath.split('/')));
    } catch {
      throw FileSystemError.FileNotFound(archivePath);
    }
    const relativePath = path.relative(contentRoot, resolvedPath);
    if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
      throw FileSystemError.NoPermissions(resolvedPath);
    }
    return resolvedPath;
  }

  private archiveMtime(archivePath: string) {
    try {
      return fs.statSync(archivePath).mtimeMs;
    } catch {
      return 0;
    }
  }

  private getArchive(archivePath: string) {
    try {
      const stat = fs.statSync(archivePath);
      const cached = this.archives.get(archivePath);
      if (cached && cached.mtime === stat.mtimeMs && cached.ctime === stat.ctimeMs && cached.size === stat.size) {
        return cached.archive;
      }
      const archive = new AdmZip(archivePath);
      this.archives.set(archivePath, { archive, mtime: stat.mtimeMs, ctime: stat.ctimeMs, size: stat.size });
      return archive;
    } catch {
      this.archives.delete(archivePath);
      throw FileSystemError.FileNotFound(archivePath);
    }
  }
}
