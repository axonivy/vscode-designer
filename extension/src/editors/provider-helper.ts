import type { TextDocument } from 'vscode';
import { IAR_CONTENT_SCHEME, iarContentEngineFileName } from '../project-explorer/iar-content-provider';

export const resolveEditorDocument = (document: TextDocument) => {
  const readOnly = document.uri.scheme === IAR_CONTENT_SCHEME;
  const engineFileName = readOnly ? iarContentEngineFileName(document.uri) : document.fileName;
  return { engineFileName, readOnly };
};
