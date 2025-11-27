import fs from 'fs';
import * as vscode from 'vscode';

// from https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/manifest.ts
export type ViteManifest = Record<string, ViteManifestChunk>;

export interface ViteManifestChunk {
  src?: string;
  file: string;
  css?: string[];
  assets?: string[];
  isEntry?: boolean;
  name?: string;
  isDynamicEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
}

export interface ViteManifestEntry {
  source: string;
  chunk: ViteManifestChunk;
}

export const ROOT_ENTRY = 'index.html';

export function parseBuildManifest(root: vscode.Uri): ViteManifest {
  const manifest = vscode.Uri.joinPath(root, 'build.manifest.json').fsPath;
  return JSON.parse(fs.readFileSync(manifest, 'utf8'));
}

export function findRootEntry(manifest: ViteManifest): ViteManifestEntry {
  const entry = Object.entries(manifest).find(entry => entry[1].isEntry);
  if (!entry) {
    throw new Error('Could not find root entry');
  }
  return { source: entry[0], chunk: entry[1] };
}

export function findRootHtml(appPath: vscode.Uri, manifest: ViteManifest): vscode.Uri {
  const rootEntry = findRootEntry(manifest);
  return vscode.Uri.joinPath(appPath, rootEntry.chunk.src ?? rootEntry.source);
}

export function findEditorWorker(rootPath: vscode.Uri): vscode.Uri | undefined {
  return vscode.Uri.joinPath(rootPath, 'assets', 'monaco-workers', 'editor.js');
}
