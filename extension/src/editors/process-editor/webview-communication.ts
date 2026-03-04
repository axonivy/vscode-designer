import { TypeSearchRequest } from '@axonivy/process-editor-inscription-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import * as vscode from 'vscode';
import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemTag,
  CompletionList,
  CompletionParams,
  CompletionRequest,
  DidChangeTextDocumentNotification,
  DidChangeTextDocumentParams,
  DidOpenTextDocumentNotification,
  DidOpenTextDocumentParams,
  MarkupContent,
  Position,
  Range,
  TextEdit
} from 'vscode-languageclient';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Messenger } from 'vscode-messenger';
import { MessageParticipant, NotificationType, RequestType } from 'vscode-messenger-common';
import { IvyBrowserViewProvider } from '../../browser/ivy-browser-view-provider';
import { JavaCompletion } from '../java-completion';
import { isAllTypesSearchRequest, isSearchResult } from '../notification-helper';
import { WebSocketForwarder } from '../websocket-forwarder';
import { SendInscriptionNotification, handleActionLocal } from './inscription-view/action-handlers';

const ColorThemeChangedNotification: NotificationType<'dark' | 'light'> = { method: 'colorThemeChanged' };
const WebviewConnectionReadyNotification: NotificationType<void> = { method: 'connectionReady' };
const InitializeConnectionRequest: RequestType<void, void> = { method: 'initializeConnection' };
const StartProcessRequest: RequestType<string, Promise<void>> = { method: 'startProcess' };

// Save document notification - allow webview to trigger save when Monaco captures Cmd+S
const SaveDocumentNotification: NotificationType<void> = { method: 'document/save' };

const InscriptionWebSocketMessage: NotificationType<unknown> = { method: 'inscriptionWebSocketMessage' };
const IvyScriptWebSocketMessage: NotificationType<unknown> = { method: 'ivyScriptWebSocketMessage' };

export const setupCommunication = (
  websocketUrl: URL,
  messenger: Messenger,
  webviewPanel: vscode.WebviewPanel,
  document: vscode.CustomDocument,
  messageParticipant?: MessageParticipant
) => {
  if (messageParticipant === undefined) {
    return;
  }
  const toDispose = new DisposableCollection(
    new InscriptionWebSocketForwarder(websocketUrl, messenger, messageParticipant, document),
    new IvyScriptWebSocketForwarder(websocketUrl, messenger, messageParticipant, document),
    messenger.onNotification(WebviewConnectionReadyNotification, () => handleWebviewReadyNotification(messenger, messageParticipant), {
      sender: messageParticipant
    }),
    messenger.onRequest(StartProcessRequest, startUri => IvyBrowserViewProvider.instance.openEngineRelativeUrl(startUri), {
      sender: messageParticipant
    }),
    // Save document handler - triggered when Monaco captures Cmd+S in webview
    messenger.onNotification(
      SaveDocumentNotification,
      () => {
        vscode.commands.executeCommand('workbench.action.files.save');
      },
      { sender: messageParticipant }
    ),
    vscode.window.onDidChangeActiveColorTheme(theme =>
      messenger.sendNotification(ColorThemeChangedNotification, messageParticipant, vsCodeThemeToMonacoTheme(theme))
    )
  );
  webviewPanel.onDidDispose(() => toDispose.dispose());
};

const handleWebviewReadyNotification = async (messenger: Messenger, messageParticipant: MessageParticipant) => {
  await messenger.sendRequest(InitializeConnectionRequest, messageParticipant);
  messenger.sendNotification(ColorThemeChangedNotification, messageParticipant, vsCodeThemeToMonacoTheme(vscode.window.activeColorTheme));
};

const vsCodeThemeToMonacoTheme = (theme: vscode.ColorTheme) => {
  return theme.kind === vscode.ColorThemeKind.Dark || theme.kind === vscode.ColorThemeKind.HighContrast ? 'dark' : 'light';
};

class InscriptionWebSocketForwarder extends WebSocketForwarder {
  private readonly sendInscriptionNotification: SendInscriptionNotification;

  currentTypeSearch: { type: string; id: number } | undefined;

  readonly javaCompletion: JavaCompletion;

  constructor(websocketUrl: URL, messenger: Messenger, messageParticipant: MessageParticipant, document: vscode.CustomDocument) {
    super(websocketUrl, 'ivy-inscription-lsp', messenger, messageParticipant, InscriptionWebSocketMessage);
    this.sendInscriptionNotification = (type: string) =>
      this.messenger.sendNotification(this.notificationType, this.messageParticipant, JSON.stringify({ method: type }));
    this.javaCompletion = new JavaCompletion(document.uri, 'inscription');
  }

  protected override handleClientMessage(message: unknown) {
    const handled = handleActionLocal(message, this.sendInscriptionNotification);
    if (handled) {
      return;
    }
    if (isAllTypesSearchRequest<TypeSearchRequest>(message)) {
      this.currentTypeSearch = { type: message.params.type, id: message.id };
    }
    super.handleClientMessage(message);
  }

  protected override async handleServerMessage(message: string) {
    const obj = JSON.parse(message);
    if (this.currentTypeSearch?.type && isSearchResult(obj, this.currentTypeSearch.id)) {
      const javaTypes = await this.javaCompletion.javaTypes(this.currentTypeSearch.type);
      obj.result.push(...javaTypes);
      message = JSON.stringify(obj);
    }
    super.handleServerMessage(message);
  }
}

class IvyScriptWebSocketForwarder extends WebSocketForwarder {
  private readonly documents = new Map<string, TextDocument>();

  private currentCompletion:
    | {
        id: number;
        completionItems: Promise<vscode.CompletionItem[]>;
        document: TextDocument;
        position: Position;
        completionStartCharacter: number;
      }
    | undefined;
  readonly javaCompletion: JavaCompletion;

  constructor(websocketUrl: URL, messenger: Messenger, messageParticipant: MessageParticipant, document: vscode.CustomDocument) {
    super(websocketUrl, 'ivy-script-lsp', messenger, messageParticipant, IvyScriptWebSocketMessage);
    this.javaCompletion = new JavaCompletion(document.uri, 'ivy-script');
  }

  protected override handleClientMessage(message: unknown) {
    if (this.hasMethodAndParams(message)) {
      switch (message.method) {
        case DidOpenTextDocumentNotification.method:
          this.handleDidOpen(message.params as DidOpenTextDocumentParams);
          break;
        case DidChangeTextDocumentNotification.method:
          this.handleDidChange(message.params as DidChangeTextDocumentParams);
          break;
        case CompletionRequest.method:
          this.handleCompletionRequest(message.params as CompletionParams, message.id);
      }
    }
    super.handleClientMessage(message);
  }

  protected override async handleServerMessage(message: string) {
    if (this.currentCompletion) {
      const { id, completionItems, document, position, completionStartCharacter } = this.currentCompletion;
      const obj = JSON.parse(message);
      if (this.isCompletionResult(obj, id)) {
        const lspCompletionItems = (await completionItems).map(item =>
          this.toLspCompletItem(item, document, { line: position.line, completionStartCharacter })
        );
        obj.result.items.push(...lspCompletionItems);
        message = JSON.stringify(obj);
        this.currentCompletion = undefined;
      }
    }
    super.handleServerMessage(message);
  }

  handleDidOpen = (params: DidOpenTextDocumentParams) => {
    const textDocument = params.textDocument;
    const doc = TextDocument.create(textDocument.uri, textDocument.languageId, textDocument.version, textDocument.text);
    this.documents.set(textDocument.uri, doc);
  };

  handleDidChange = (params: DidChangeTextDocumentParams) => {
    const textDocument = params.textDocument;
    const currentDoc = this.documents.get(textDocument.uri);
    if (!currentDoc) {
      return;
    }
    const newDoc = TextDocument.update(currentDoc, params.contentChanges, textDocument.version);
    this.documents.set(textDocument.uri, newDoc);
  };

  handleCompletionRequest = (params: CompletionParams, id?: number) => {
    if (id === undefined) {
      return;
    }
    const document = this.documents.get(params.textDocument.uri);
    if (!document) {
      return;
    }
    const currentTextLine = document.getText(Range.create(Position.create(params.position.line, 0), params.position));
    const completionStartingIndex = Math.max(
      currentTextLine.lastIndexOf(';'),
      currentTextLine.lastIndexOf(' '),
      currentTextLine.lastIndexOf('='),
      currentTextLine.lastIndexOf('('),
      currentTextLine.lastIndexOf('.')
    );
    const completionStartCharacter = Math.max(completionStartingIndex + 1, 0);
    const toBeCompleted = currentTextLine.substring(completionStartCharacter);
    this.currentCompletion = {
      id,
      completionItems: this.javaCompletion.completionItems(toBeCompleted, 10),
      document,
      position: params.position,
      completionStartCharacter
    };
  };

  hasMethodAndParams = (message: unknown): message is { method: string; params: object; id?: number } => {
    return (
      typeof message === 'object' &&
      message !== null &&
      'method' in message &&
      typeof message.method === 'string' &&
      'params' in message &&
      typeof message.params === 'object' &&
      message.params !== null
    );
  };

  isCompletionResult = (obj: unknown, id: number): obj is { result: CompletionList } => {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'id' in obj &&
      obj.id === id &&
      'result' in obj &&
      typeof obj.result === 'object' &&
      obj.result !== null &&
      'items' in obj.result &&
      Array.isArray(obj.result.items)
    );
  };

  toLspCompletItem = (
    item: vscode.CompletionItem,
    document: TextDocument,
    completionContext: { line: number; completionStartCharacter: number }
  ): CompletionItem => {
    const label = this.toLabel(item);
    const lspItem = CompletionItem.create(label.label);
    const insertText = this.resolveInsertText(item, document, label.label);
    lspItem.kind = this.toKind(item.kind);
    lspItem.detail = item.detail;
    lspItem.sortText = item.sortText;
    lspItem.filterText = item.filterText;
    lspItem.tags = item.tags?.map(() => CompletionItemTag.Deprecated);
    lspItem.labelDetails = label;
    lspItem.documentation = this.toDocumentation(item.documentation);
    const textEdit = this.toTextEdit(item, insertText, completionContext);
    if (textEdit) {
      lspItem.textEdit = textEdit;
    }
    if (STANDARD_TYPES.includes(item.detail ?? '')) {
      return lspItem;
    }
    if (document.uri.endsWith('.code/') && item.detail && item.detail.length > 0) {
      const importStatement = `import ${item.detail};`;
      if (!document.getText().includes(importStatement)) {
        lspItem.additionalTextEdits = [TextEdit.insert(Position.create(0, 0), `${importStatement}\n`)];
      }
    } else if (!textEdit && item.detail && item.detail.length > 0) {
      // full qualified name as insert text
      lspItem.insertText = item.detail;
    } else if (!textEdit && insertText && insertText.length > 0) {
      lspItem.insertText = insertText;
    }
    return lspItem;
  };

  resolveInsertText = (item: vscode.CompletionItem, document: TextDocument, defaultText: string): string => {
    if (!document.uri.endsWith('.code/') && item.detail && item.detail.length > 0 && !STANDARD_TYPES.includes(item.detail)) {
      return item.detail;
    }
    if (typeof item.insertText === 'string') {
      return item.insertText;
    }
    if (item.insertText instanceof vscode.SnippetString) {
      return item.insertText.value;
    }
    return defaultText;
  };

  toTextEdit = (
    item: vscode.CompletionItem,
    newText: string,
    completionContext: { line: number; completionStartCharacter: number }
  ): CompletionItem['textEdit'] => {
    if (!item.range) {
      return undefined;
    }
    if ('inserting' in item.range && 'replacing' in item.range) {
      return {
        newText,
        insert: this.toDocumentRange(item.range.inserting, completionContext),
        replace: this.toDocumentRange(item.range.replacing, completionContext)
      };
    }
    return TextEdit.replace(this.toDocumentRange(item.range, completionContext), newText);
  };

  toDocumentRange = (range: vscode.Range, completionContext: { line: number; completionStartCharacter: number }): Range => {
    return Range.create(this.toDocumentPosition(range.start, completionContext), this.toDocumentPosition(range.end, completionContext));
  };

  toDocumentPosition = (position: vscode.Position, completionContext: { line: number; completionStartCharacter: number }): Position => {
    const line = completionContext.line + position.line;
    const shiftedCharacter =
      position.line === 0 ? Math.max(position.character - JavaCompletion.DUMMY_CONTENT_OFFSET, 0) : position.character;
    const character = position.line === 0 ? completionContext.completionStartCharacter + shiftedCharacter : shiftedCharacter;
    return Position.create(line, character);
  };

  toLabel = (item: vscode.CompletionItem) => {
    if (typeof item.label === 'string') {
      return { label: item.label };
    }
    return item.label;
  };

  toKind(kind?: vscode.CompletionItemKind) {
    switch (kind) {
      case vscode.CompletionItemKind.Class:
        return CompletionItemKind.Class;
      case vscode.CompletionItemKind.Interface:
        return CompletionItemKind.Interface;
      case vscode.CompletionItemKind.Enum:
        return CompletionItemKind.Enum;
      default:
        return undefined;
    }
  }

  toDocumentation = (documentation?: string | vscode.MarkdownString) => {
    if (!documentation) {
      return;
    }
    if (typeof documentation === 'string') {
      return documentation;
    }
    return { value: documentation.value, kind: 'markdown' } satisfies MarkupContent;
  };
}

// copy paste from ch.ivyteam.ivy.scripting.objects.util.StandardScriptingTypes;
const STANDARD_TYPES = [
  'ch.ivyteam.ivy.scripting.objects.Time',
  'java.lang.String',
  'java.lang.Math',
  'ch.ivyteam.ivy.scripting.objects.DateTime',
  'java.lang.System',
  'ch.ivyteam.ivy.scripting.objects.CompositeObject',
  'java.lang.Number',
  'ch.ivyteam.ivy.scripting.objects.Tree',
  'ch.ivyteam.ivy.scripting.objects.Record',
  'ch.ivyteam.ivy.scripting.objects.List',
  'java.lang.Boolean',
  'java.lang.Short',
  'java.lang.Character',
  'java.lang.Error',
  'ch.ivyteam.ivy.scripting.objects.Duration',
  'java.lang.Double',
  'ch.ivyteam.ivy.scripting.objects.Date',
  'java.math.BigDecimal',
  'java.lang.Exception',
  'java.lang.Integer',
  'java.lang.Float',
  'ch.ivyteam.ivy.scripting.objects.Xml',
  'java.lang.Byte',
  'java.lang.Long',
  'java.math.BigInteger',
  'java.lang.Throwable',
  'java.lang.Object',
  'java.lang.Class',
  'ch.ivyteam.ivy.scripting.objects.Recordset',
  'ch.ivyteam.ivy.scripting.objects.Binary',
  'ch.ivyteam.ivy.scripting.objects.File',
  'ch.ivyteam.ivy.scripting.objects.Tuple',
  'ch.ivyteam.ivy.scripting.objects.BusinessDuration'
];
