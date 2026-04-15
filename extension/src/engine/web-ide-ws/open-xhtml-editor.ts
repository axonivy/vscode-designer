import { Element } from 'domhandler';
import { DomUtils, parseDocument } from 'htmlparser2';
import { Selection, Uri, window, workspace, type TextDocument } from 'vscode';
import { logWarningMessage } from '../../base/logging-util';
import type { OpenXhtmlEditorArgs } from '../api/jsonrpc';

export const openXhtmlEditor = async (args: OpenXhtmlEditorArgs) => {
  if (!args.bean.uri) {
    return false;
  }

  const document = await workspace.openTextDocument(Uri.parse(args.bean.uri));
  const selection = findXhtmlElementSelection(document, args.selection);
  await window.showTextDocument(document, selection ? { selection } : undefined);

  if (!selection) {
    logWarningMessage(`Could not resolve XHTML element '${args.selection}' in '${args.bean.uri}'.`);
  }

  return true;
};

export const findXhtmlElementSelection = (document: TextDocument, elementId?: string) => {
  const trimmedId = elementId?.trim();
  if (!trimmedId) {
    return undefined;
  }

  const xhtmlDocument = parseDocument(document.getText(), {
    xmlMode: true,
    decodeEntities: false,
    withStartIndices: true
  });
  const element = findBestMatchingXhtmlElement(xhtmlDocument, trimmedId);
  if (!(element instanceof Element) || element.startIndex === null) {
    return undefined;
  }

  const position = document.positionAt(element.startIndex);
  return new Selection(position, position);
};

const findBestMatchingXhtmlElement = (xhtmlDocument: ReturnType<typeof parseDocument>, selectedId: string) => {
  const requestedIdParts = toJsfIdParts(selectedId);
  if (requestedIdParts.length === 0) {
    return undefined;
  }

  const elements = DomUtils.findAll(
    node => node instanceof Element && typeof node.attribs.id === 'string' && normalizeJsfIdSegment(node.attribs.id).length > 0,
    xhtmlDocument.children
  ).filter((node): node is Element => node instanceof Element);

  const exactElement = elements.find(element => {
    const localId = normalizeJsfIdSegment(element.attribs.id);
    return localId === selectedId || buildElementIdPath(element).join(':') === selectedId;
  });
  if (exactElement) {
    return exactElement;
  }

  for (let requestIndex = requestedIdParts.length - 1; requestIndex >= 0; requestIndex--) {
    const requestPart = requestedIdParts[requestIndex];
    const bestCandidate = elements
      .filter(element => normalizeJsfIdSegment(element.attribs.id) === requestPart)
      .map(element => {
        const path = buildElementIdPath(element);
        return {
          element,
          score: countMatchingIdSegments(path, requestedIdParts, requestIndex),
          depth: path.length
        };
      })
      .filter(candidate => candidate.score > 0)
      .sort((left, right) => right.score - left.score || right.depth - left.depth)[0];

    if (bestCandidate) {
      return bestCandidate.element;
    }
  }

  return undefined;
};

const buildElementIdPath = (element: Element) => {
  const idSegments: string[] = [];
  let currentElement: Element | null = element;
  while (currentElement) {
    const currentId = normalizeJsfIdSegment(currentElement.attribs.id);
    if (currentId) {
      idSegments.unshift(currentId);
    }
    currentElement = currentElement.parent instanceof Element ? currentElement.parent : null;
  }
  return idSegments;
};

const countMatchingIdSegments = (elementPath: string[], requestedIdParts: string[], requestIndex: number) => {
  let remainingRequestIndex = requestIndex;
  let matchedSegments = 0;

  for (let elementIndex = elementPath.length - 1; elementIndex >= 0 && remainingRequestIndex >= 0; elementIndex--) {
    const elementPart = elementPath[elementIndex];
    while (remainingRequestIndex >= 0 && requestedIdParts[remainingRequestIndex] !== elementPart) {
      remainingRequestIndex--;
    }
    if (remainingRequestIndex < 0) {
      break;
    }
    matchedSegments++;
    remainingRequestIndex--;
  }

  return matchedSegments;
};

const toJsfIdParts = (selectedId: string) =>
  selectedId
    .split(':')
    .map(part => normalizeJsfIdSegment(part))
    .filter(part => part.length > 0);

const normalizeJsfIdSegment = (id: string | undefined) => id?.trim() ?? '';
