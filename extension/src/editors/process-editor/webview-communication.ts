import type { TypeSearchRequest } from '@axonivy/process-editor-inscription-protocol';
import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import type { ColorTheme, CustomDocument, WebviewPanel } from 'vscode';
import {
  ColorThemeKind,
  commands,
  MarkdownString,
  SnippetString,
  CompletionItem as VSCodeCompletionItem,
  CompletionItemKind as VSCodeCompletionItemKind,
  Position as VSCodePosition,
  Range as VSCodeRange,
  window,
  type Location as VSCodeLocation,
  type LocationLink as VSCodeLocationLink
} from 'vscode';
import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemTag,
  type CompletionList,
  type CompletionParams,
  CompletionRequest,
  DidChangeTextDocumentNotification,
  type DidChangeTextDocumentParams,
  DidOpenTextDocumentNotification,
  type DidOpenTextDocumentParams,
  InsertTextFormat,
  type MarkupContent,
  Position,
  Range,
  TextEdit
} from 'vscode-languageclient';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Messenger } from 'vscode-messenger';
import type { MessageParticipant, NotificationType, RequestType } from 'vscode-messenger-common';
import { IvyBrowserViewProvider } from '../../views/browser/ivy-browser-view-provider';
import { JavaProvider } from '../java-provider';
import {
  isIvyEnvironmentRootCompletionPrefix,
  toIvyEnvironmentCompletionLabel,
  toJavaEnvironmentCompletionLabel
} from '../ivy-script-java-translation';
import { isAllTypesSearchRequest, isSearchResult } from '../notification-helper';
import { WebSocketForwarder } from '../websocket-forwarder';
import { handleActionLocal, type SendInscriptionNotification } from './inscription-view/action-handlers';

const ColorThemeChangedNotification: NotificationType<'dark' | 'light'> = { method: 'colorThemeChanged' };
const WebviewConnectionReadyNotification: NotificationType<void> = { method: 'connectionReady' };
const InitializeConnectionRequest: RequestType<void, void> = { method: 'initializeConnection' };
const StartProcessRequest: RequestType<string, Promise<void>> = { method: 'startProcess' };

// Save document notification - allow webview to trigger save when Monaco captures Cmd+S
const SaveDocumentNotification: NotificationType<void> = { method: 'document/save' };
const DefinitionLinkActivationNotification: NotificationType<{ uri: string; position: Position }> = {
  method: 'definitionLinkActivation'
};

const withTimeout = <T>(promise: Promise<T>, fallback: T, timeoutMs: number) =>
  new Promise<T>(resolve => {
    const timeout = setTimeout(() => resolve(fallback), timeoutMs);
    promise.then(
      value => {
        clearTimeout(timeout);
        resolve(value);
      },
      () => {
        clearTimeout(timeout);
        resolve(fallback);
      }
    );
  });

const InscriptionWebSocketMessage: NotificationType<unknown> = { method: 'inscriptionWebSocketMessage' };
const IvyScriptWebSocketMessage: NotificationType<unknown> = { method: 'ivyScriptWebSocketMessage' };

type PendingCompletion = {
  id: number;
  uri: string;
  document: TextDocument;
  position: Position;
  completionStartCharacter: number;
  completionItems: Promise<VSCodeCompletionItem[]>;
  contextualJavaCompletionItems: Promise<VSCodeCompletionItem[]>;
  isIvyEnvironmentRootCompletion: boolean;
  timeout: ReturnType<typeof setTimeout>;
};

export const setupCommunication = (
  websocketUrl: URL,
  messenger: Messenger,
  webviewPanel: WebviewPanel,
  document: CustomDocument,
  messageParticipant?: MessageParticipant
) => {
  if (messageParticipant === undefined) {
    return;
  }
  const inscriptionForwarder = new InscriptionWebSocketForwarder(websocketUrl, messenger, messageParticipant, document);
  const ivyScriptForwarder = new IvyScriptWebSocketForwarder(websocketUrl, messenger, messageParticipant, document);
  const toDispose = new DisposableCollection(
    inscriptionForwarder,
    ivyScriptForwarder,
    messenger.onNotification(
      DefinitionLinkActivationNotification,
      activation => void ivyScriptForwarder.openDefinitionAtPosition(activation.uri, activation.position).catch(() => undefined),
      { sender: messageParticipant }
    ),
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
        commands.executeCommand('workbench.action.files.save');
      },
      { sender: messageParticipant }
    ),
    window.onDidChangeActiveColorTheme(theme =>
      messenger.sendNotification(ColorThemeChangedNotification, messageParticipant, vsCodeThemeToMonacoTheme(theme))
    )
  );
  webviewPanel.onDidDispose(() => toDispose.dispose());
};

const handleWebviewReadyNotification = async (messenger: Messenger, messageParticipant: MessageParticipant) => {
  await messenger.sendRequest(InitializeConnectionRequest, messageParticipant);
  messenger.sendNotification(ColorThemeChangedNotification, messageParticipant, vsCodeThemeToMonacoTheme(window.activeColorTheme));
};

const vsCodeThemeToMonacoTheme = (theme: ColorTheme) => {
  return theme.kind === ColorThemeKind.Dark || theme.kind === ColorThemeKind.HighContrast ? 'dark' : 'light';
};

class InscriptionWebSocketForwarder extends WebSocketForwarder {
  private readonly sendInscriptionNotification: SendInscriptionNotification;

  currentTypeSearch: { type: string; id: number } | undefined;

  readonly javaCompletion: JavaProvider;

  constructor(websocketUrl: URL, messenger: Messenger, messageParticipant: MessageParticipant, document: CustomDocument) {
    super(websocketUrl, 'ivy-inscription-lsp', messenger, messageParticipant, InscriptionWebSocketMessage);
    this.sendInscriptionNotification = (type: string) =>
      this.messenger.sendNotification(this.notificationType, this.messageParticipant, JSON.stringify({ method: type }));
    this.javaCompletion = new JavaProvider(document.uri);
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

  private readonly pendingCompletions = new Map<number, PendingCompletion>();
  private readonly latestCompletionByDocument = new Map<string, number>();
  private readonly locallyAnsweredCompletions = new Set<number>();
  private readonly fallbackCompletionsInProgress = new Set<number>();
  private currentHover: { id: number; documentation: Promise<string | undefined> } | undefined;
  private readonly resolvedJavaDefinitions = new Map<string, VSCodeLocation | VSCodeLocationLink>();
  private readonly currentDefinitions = new Map<
    number,
    {
      location: Promise<VSCodeLocation | VSCodeLocationLink | undefined>;
      textDocumentUri: string;
      range: Range;
    }
  >();
  private initializationRequestId: number | undefined;
  readonly javaCompletion: JavaProvider;

  constructor(websocketUrl: URL, messenger: Messenger, messageParticipant: MessageParticipant, document: CustomDocument) {
    super(websocketUrl, 'ivy-script-lsp', messenger, messageParticipant, IvyScriptWebSocketMessage);
    this.javaCompletion = new JavaProvider(document.uri);
  }

  protected override handleClientMessage(message: unknown) {
    if (this.hasMethodAndParams(message)) {
      switch (message.method) {
        case 'initialize':
          this.initializationRequestId = message.id;
          break;
        case DidOpenTextDocumentNotification.method:
          this.handleDidOpen(message.params as DidOpenTextDocumentParams);
          break;
        case DidChangeTextDocumentNotification.method:
          this.handleDidChange(message.params as DidChangeTextDocumentParams);
          break;
        case CompletionRequest.method:
          this.handleCompletionRequest(message.params as CompletionParams, message.id);
          break;
        case 'textDocument/hover':
          this.handleHoverRequest(message.params as { textDocument: { uri: string }; position: Position }, message.id);
          break;
        case 'textDocument/definition':
          this.handleDefinitionRequest(message.params as { textDocument: { uri: string }; position: Position }, message.id);
          break;
      }
    }
    super.handleClientMessage(message);
  }

  protected override async handleServerMessage(message: string) {
    const response = JSON.parse(message);
    if (
      typeof response === 'object' &&
      response !== null &&
      typeof this.initializationRequestId === 'number' &&
      response.id === this.initializationRequestId
    ) {
      this.initializationRequestId = undefined;
      if (typeof response.result === 'object' && response.result !== null) {
        // This bridge handles Java definition requests locally through the VS Code Java provider.
        response.result.capabilities = {
          ...(response.result.capabilities ?? {}),
          definitionProvider: true
        };
        message = JSON.stringify(response);
      }
    }
    if (
      typeof response === 'object' &&
      response !== null &&
      'id' in response &&
      typeof response.id === 'number' &&
      !('method' in response)
    ) {
      const definition = this.currentDefinitions.get(response.id);
      if (definition) {
        this.currentDefinitions.delete(response.id);
        const location = await definition.location;
        if (location) {
          response.result = [{ uri: definition.textDocumentUri, range: definition.range }];
          delete response.error;
          message = JSON.stringify(response);
        }
      }
    }
    if (this.currentHover) {
      const { id, documentation } = this.currentHover;
      const obj = JSON.parse(message);
      if (this.isHoverResult(obj, id)) {
        const javaDocumentation = await documentation;
        if (javaDocumentation) {
          const existingDocumentation = this.toMarkdown(obj.result?.contents);
          obj.result = {
            ...(obj.result ?? {}),
            contents: {
              kind: 'markdown',
              value: [existingDocumentation, javaDocumentation].filter(Boolean).join('\n\n')
            }
          };
          message = JSON.stringify(obj);
        }
        this.currentHover = undefined;
      }
    }
    if (typeof response === 'object' && response !== null && 'id' in response && typeof response.id === 'number') {
      if (this.locallyAnsweredCompletions.delete(response.id)) {
        return;
      }
      const pending = this.pendingCompletions.get(response.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingCompletions.delete(response.id);
        this.fallbackCompletionsInProgress.delete(response.id);
        if (this.isCompletionResult(response, response.id)) {
          const [javaTypeItems, contextualJavaItems] = await Promise.all([
            withTimeout(pending.completionItems, [], 100),
            withTimeout(pending.contextualJavaCompletionItems, [], 100)
          ]);
          const hasIvyEnvironmentAliases = response.result.items.some(item =>
            ['case', 'task'].includes(this.normalizeCompletionLabel(item.label))
          );
          const ivyEnvironmentDocs = hasIvyEnvironmentAliases
            ? await withTimeout(this.javaCompletion.ivyEnvironmentCompletionDocumentation(), { case: undefined, task: undefined }, 100)
            : {};
          const lspCompletionItems = javaTypeItems.map(item =>
            this.toLspCompletItem(item, pending.document, {
              line: pending.position.line,
              completionStartCharacter: pending.completionStartCharacter
            })
          );
          this.addJavaDocumentation(response.result.items, contextualJavaItems);
          this.addIvyEnvironmentCompletionDocumentation(response.result.items, ivyEnvironmentDocs);
          response.result.items.push(...lspCompletionItems);
          message = JSON.stringify(response);
        }
      }
    }
    super.handleServerMessage(message);
  }

  handleDidOpen = (params: DidOpenTextDocumentParams) => {
    const textDocument = params.textDocument;
    this.clearResolvedJavaDefinitions(textDocument.uri);
    const doc = TextDocument.create(textDocument.uri, textDocument.languageId, textDocument.version, textDocument.text);
    this.documents.set(textDocument.uri, doc);
  };

  handleDidChange = (params: DidChangeTextDocumentParams) => {
    const textDocument = params.textDocument;
    this.clearResolvedJavaDefinitions(textDocument.uri);
    const currentDoc = this.documents.get(textDocument.uri);
    if (!currentDoc) {
      return;
    }
    const newDoc = TextDocument.update(currentDoc, params.contentChanges, textDocument.version);
    this.documents.set(textDocument.uri, newDoc);
  };

  handleDefinitionRequest = (params: { textDocument: { uri: string }; position: Position }, id?: number) => {
    if (id === undefined) {
      return;
    }
    const document = this.documents.get(params.textDocument.uri);
    if (!document) {
      return;
    }
    const lines = document.getText().split(/\r\n|\n|\r/);
    const line = lines[params.position.line] ?? '';
    const imports = lines.filter(sourceLine => /^\s*import\s+(?:static\s+)?[\w.$*]+\s*;\s*$/.test(sourceLine));
    const javaPosition = new VSCodePosition(0, Math.min(params.position.character, line.length));
    const range = this.definitionWordRange(line, params.position);
    const key = this.definitionKey(params.textDocument.uri, range);
    this.currentDefinitions.set(id, {
      location: this.javaCompletion
        .definitionAt(line, javaPosition, imports)
        .then(location => {
          if (location) {
            this.resolvedJavaDefinitions.set(key, location);
          }
          return location ?? this.resolvedJavaDefinitions.get(key);
        })
        .catch(() => this.resolvedJavaDefinitions.get(key)),
      textDocumentUri: params.textDocument.uri,
      range
    });
  };

  openDefinitionAtPosition = async (uri: string, position: Position) => {
    const document = this.documents.get(uri);
    if (!document) {
      return false;
    }
    const lines = document.getText().split(/\r\n|\n|\r/);
    const line = lines[position.line] ?? '';
    const imports = lines.filter(sourceLine => /^\s*import\s+(?:static\s+)?[\w.$*]+\s*;\s*$/.test(sourceLine));
    const key = this.definitionKey(uri, this.definitionWordRange(line, position));
    const location =
      this.resolvedJavaDefinitions.get(key) ??
      (await this.javaCompletion.definitionAt(line, new VSCodePosition(0, Math.min(position.character, line.length)), imports));
    if (!location) {
      return false;
    }
    this.resolvedJavaDefinitions.set(key, location);
    await this.javaCompletion.openJavaLocation(location);
    return true;
  };

  definitionKey = (uri: string, range: Range) => `${uri}:${range.start.line}:${range.start.character}:${range.end.character}`;

  clearResolvedJavaDefinitions = (uri: string) => {
    for (const key of this.resolvedJavaDefinitions.keys()) {
      if (key.startsWith(`${uri}:`)) {
        this.resolvedJavaDefinitions.delete(key);
      }
    }
  };

  definitionWordRange = (line: string, position: Position): Range => {
    const isWordCharacter = (character: string | undefined) => character !== undefined && /[\w$]/.test(character);
    let start = Math.max(0, Math.min(position.character, line.length));
    if (!isWordCharacter(line[start]) && isWordCharacter(line[start - 1])) {
      start--;
    }
    let end = start;
    while (start > 0 && isWordCharacter(line[start - 1])) {
      start--;
    }
    while (end < line.length && isWordCharacter(line[end])) {
      end++;
    }
    return Range.create(Position.create(position.line, start), Position.create(position.line, end));
  };

  handleHoverRequest = (params: { textDocument: { uri: string }; position: Position }, id?: number) => {
    if (id === undefined) {
      return;
    }
    const document = this.documents.get(params.textDocument.uri);
    if (!document) {
      return;
    }
    const lines = document.getText().split(/\r\n|\n|\r/);
    const line = lines[params.position.line] ?? '';
    const imports = lines.filter(sourceLine => /^\s*import\s+(?:static\s+)?[\w.$*]+\s*;\s*$/.test(sourceLine));
    const javaPosition = new VSCodePosition(0, Math.min(params.position.character, line.length));
    this.currentHover = {
      id,
      documentation: this.javaCompletion.hover(line, javaPosition, imports)
    };
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
    const lines = document.getText().split(/\r\n|\n|\r/);
    const currentLine = lines[params.position.line] ?? '';
    const imports = lines.filter(sourceLine => /^\s*import\s+(?:static\s+)?[\w.$*]+\s*;\s*$/.test(sourceLine));
    const cursorCharacter = Math.min(params.position.character, currentLine.length);
    const completionPrefix = currentLine.slice(0, cursorCharacter);
    const contextualPrefix = completionPrefix.replace(/[\w$]*$/, '');
    const isMemberCompletion = /\.\s*[\w$]*$/.test(completionPrefix);
    const isIvyEnvironmentRootCompletion = isIvyEnvironmentRootCompletionPrefix(completionPrefix);
    if (isIvyEnvironmentRootCompletion) {
      void this.javaCompletion.ivyEnvironmentCompletionDocumentation();
    }
    const pending: Omit<PendingCompletion, 'timeout'> = {
      id,
      uri: params.textDocument.uri,
      completionItems: isMemberCompletion ? Promise.resolve([]) : this.javaCompletion.completionItems(toBeCompleted, 50),
      // Start Java contextual completion alongside IvyScript LSP completion; it is also used if the LSP request stalls.
      contextualJavaCompletionItems: isMemberCompletion
        ? this.javaCompletion.contextualCompletionItems(contextualPrefix, new VSCodePosition(0, contextualPrefix.length), imports, 50)
        : Promise.resolve([]),
      document,
      position: params.position,
      completionStartCharacter,
      isIvyEnvironmentRootCompletion
    };
    const timeout = setTimeout(() => void this.fallbackCompletion(pending), 750);
    this.pendingCompletions.set(id, { ...pending, timeout });
    this.latestCompletionByDocument.set(params.textDocument.uri, id);
  };

  fallbackCompletion = async (request: Omit<PendingCompletion, 'timeout'>) => {
    const pending = this.pendingCompletions.get(request.id);
    if (!pending || this.fallbackCompletionsInProgress.has(request.id)) {
      return;
    }
    this.fallbackCompletionsInProgress.add(request.id);
    const [javaTypeItems, contextualJavaItems] = await Promise.all([
      withTimeout(pending.completionItems, [], 500),
      withTimeout(pending.contextualJavaCompletionItems, [], 500)
    ]);
    if (!this.pendingCompletions.has(request.id)) {
      this.fallbackCompletionsInProgress.delete(request.id);
      return;
    }

    const resultItems: CompletionItem[] = [];
    if (this.latestCompletionByDocument.get(pending.uri) === pending.id) {
      if (pending.isIvyEnvironmentRootCompletion) {
        resultItems.push(
          ...contextualJavaItems.flatMap(item => {
            const javaLabel = this.normalizeCompletionLabel(this.toLabel(item).label);
            const ivyLabel = toIvyEnvironmentCompletionLabel(javaLabel);
            return ivyLabel ? [this.toContextualLspCompletionItem(item, pending, ivyLabel, true)] : [];
          })
        );
        resultItems.push(this.createCompletionItem('casemap', pending, 'ICaseMapService'));
      } else {
        resultItems.push(...contextualJavaItems.map(item => this.toContextualLspCompletionItem(item, pending)));
        resultItems.push(
          ...javaTypeItems.map(item => this.toLspCompletItem(item, pending.document, {
            line: pending.position.line,
            completionStartCharacter: pending.completionStartCharacter
          }))
        );
      }
    }

    const uniqueItems = [...new Map(resultItems.map(item => [this.normalizeCompletionLabel(item.label), item])).values()];
    this.pendingCompletions.delete(request.id);
    this.fallbackCompletionsInProgress.delete(request.id);
    this.locallyAnsweredCompletions.add(request.id);
    setTimeout(() => this.locallyAnsweredCompletions.delete(request.id), 60_000);
    this.messenger.sendNotification(
      this.notificationType,
      this.messageParticipant,
      JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { isIncomplete: false, items: uniqueItems } })
    );
  };

  toContextualLspCompletionItem = (
    item: VSCodeCompletionItem,
    pending: PendingCompletion,
    label = this.toLabel(item).label,
    ivyEnvironmentAlias = false
  ) => {
    const completion = CompletionItem.create(label);
    const labelDetails = this.toLabel(item);
    const insertText = ivyEnvironmentAlias
      ? label
      : typeof item.insertText === 'string'
        ? item.insertText
        : item.insertText instanceof SnippetString
          ? item.insertText.value
          : labelDetails.label;
    completion.kind = this.toKind(item.kind);
    completion.detail = item.detail;
    completion.sortText = item.sortText;
    completion.filterText = ivyEnvironmentAlias ? label : item.filterText;
    completion.documentation = this.toDocumentation(item.documentation);
    completion.textEdit = TextEdit.replace(
      Range.create(
        Position.create(pending.position.line, pending.completionStartCharacter),
        Position.create(pending.position.line, pending.position.character)
      ),
      insertText
    );
    completion.insertTextFormat = !ivyEnvironmentAlias && item.insertText instanceof SnippetString
      ? InsertTextFormat.Snippet
      : InsertTextFormat.PlainText;
    return completion;
  };

  createCompletionItem = (label: string, pending: PendingCompletion, detail?: string) => {
    const completion = CompletionItem.create(label);
    completion.kind = CompletionItemKind.Variable;
    completion.detail = detail;
    completion.insertText = label;
    completion.filterText = label;
    completion.textEdit = TextEdit.replace(
      Range.create(
        Position.create(pending.position.line, pending.completionStartCharacter),
        Position.create(pending.position.line, pending.position.character)
      ),
      label
    );
    return completion;
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

  isHoverResult = (obj: unknown, id: number): obj is { result: { contents?: unknown; [key: string]: unknown } | null } => {
    return typeof obj === 'object' && obj !== null && 'id' in obj && obj.id === id && 'result' in obj;
  };

  toMarkdown = (contents: unknown): string => {
    if (typeof contents === 'string') {
      return contents;
    }
    if (Array.isArray(contents)) {
      return contents.map(content => this.toMarkdown(content)).filter(Boolean).join('\n\n');
    }
    if (typeof contents === 'object' && contents !== null) {
      if ('value' in contents && typeof contents.value === 'string') {
        if ('kind' in contents) {
          return contents.value;
        }
        if ('language' in contents && typeof contents.language === 'string') {
          return `\`\`\`${contents.language}\n${contents.value}\n\`\`\``;
        }
      }
    }
    return '';
  };

  addIvyEnvironmentCompletionDocumentation = (
    completionItems: CompletionItem[],
    documentation: { case?: string; task?: string }
  ) => {
    for (const item of completionItems) {
      const label = this.normalizeCompletionLabel(item.label);
      const ivyDocumentation = label === 'case' ? documentation.case : label === 'task' ? documentation.task : undefined;
      if (!ivyDocumentation) {
        continue;
      }
      const existingDocumentation = this.toMarkdown(item.documentation);
      item.documentation = {
        kind: 'markdown',
        value: [existingDocumentation, ivyDocumentation].filter(Boolean).join('\n\n')
      };
    }
  };

  addJavaDocumentation = (completionItems: CompletionItem[], javaItems: VSCodeCompletionItem[]) => {
    const documentationByLabel = new Map<string, VSCodeCompletionItem['documentation']>();
    for (const javaItem of javaItems) {
      if (!javaItem.documentation) {
        continue;
      }
      const label = this.normalizeCompletionLabel(this.toLabel(javaItem).label);
      if (!documentationByLabel.has(label)) {
        documentationByLabel.set(label, javaItem.documentation);
      }
    }

    for (const item of completionItems) {
      const label = this.normalizeCompletionLabel(item.label);
      const javaAlias = this.normalizeCompletionLabel(toJavaEnvironmentCompletionLabel(label));
      const javaDocumentation = documentationByLabel.get(label) ?? documentationByLabel.get(javaAlias);
      const markdown = this.toDocumentation(javaDocumentation);
      if (!markdown) {
        continue;
      }
      const existingDocumentation = this.toMarkdown(item.documentation);
      const javaDocumentationMarkdown = this.toMarkdown(markdown);
      item.documentation = {
        kind: 'markdown',
        value: [existingDocumentation, javaDocumentationMarkdown].filter(Boolean).join('\n\n')
      };
    }
  };

  normalizeCompletionLabel = (label: string) => label.trim().replace(/\s+/g, ' ').replace(/\s*\(.*$/, '');

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
    item: VSCodeCompletionItem,
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

  resolveInsertText = (item: VSCodeCompletionItem, document: TextDocument, defaultText: string): string => {
    if (!document.uri.endsWith('.code/') && item.detail && item.detail.length > 0 && !STANDARD_TYPES.includes(item.detail)) {
      return item.detail;
    }
    if (typeof item.insertText === 'string') {
      return item.insertText;
    }
    if (item.insertText instanceof SnippetString) {
      return item.insertText.value;
    }
    return defaultText;
  };

  toTextEdit = (
    item: VSCodeCompletionItem,
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

  toDocumentRange = (range: VSCodeRange, completionContext: { line: number; completionStartCharacter: number }): Range => {
    return Range.create(this.toDocumentPosition(range.start, completionContext), this.toDocumentPosition(range.end, completionContext));
  };

  toDocumentPosition = (position: VSCodePosition, completionContext: { line: number; completionStartCharacter: number }): Position => {
    const line = completionContext.line + position.line;
    const shiftedCharacter = position.line === 0 ? Math.max(position.character - JavaProvider.DUMMY_CONTENT.length, 0) : position.character;
    const character = position.line === 0 ? completionContext.completionStartCharacter + shiftedCharacter : shiftedCharacter;
    return Position.create(line, character);
  };

  toLabel = (item: VSCodeCompletionItem) => {
    if (typeof item.label === 'string') {
      return { label: item.label };
    }
    return item.label;
  };

  toKind(kind?: VSCodeCompletionItemKind) {
    switch (kind) {
      case VSCodeCompletionItemKind.Class:
        return CompletionItemKind.Class;
      case VSCodeCompletionItemKind.Interface:
        return CompletionItemKind.Interface;
      case VSCodeCompletionItemKind.Enum:
        return CompletionItemKind.Enum;
      case VSCodeCompletionItemKind.Method:
        return CompletionItemKind.Method;
      case VSCodeCompletionItemKind.Function:
        return CompletionItemKind.Function;
      case VSCodeCompletionItemKind.Field:
      case VSCodeCompletionItemKind.Property:
        return CompletionItemKind.Field;
      case VSCodeCompletionItemKind.Variable:
        return CompletionItemKind.Variable;
      case VSCodeCompletionItemKind.Constant:
        return CompletionItemKind.Constant;
      case VSCodeCompletionItemKind.Module:
        return CompletionItemKind.Module;
      default:
        return undefined;
    }
  }

  toDocumentation = (documentation?: string | MarkdownString) => {
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
