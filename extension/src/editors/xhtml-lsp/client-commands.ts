import * as vscode from 'vscode';
import { Code2ProtocolConverter, ExecuteCommandParams, LanguageClient } from 'vscode-languageclient/node';
import * as lsprot from 'vscode-languageserver-protocol';

export const onExecuteClientCommand = async (languageClient: LanguageClient, params: ExecuteCommandParams) => {
  const args = params.arguments ?? [];
  if (params.command === 'vscode.executeDocumentSymbolProvider') {
    args[0] = languageClient.protocol2CodeConverter.asUri(args[0]);
    const msg = await vscode.commands.executeCommand(params.command, ...args);
    return asDocumentSymbols(languageClient.code2ProtocolConverter, msg);
  }
  if (params.command === 'vscode.executeWorkspaceSymbolProvider') {
    const msg = await vscode.commands.executeCommand(params.command, ...args);
    return asWorkspaceSymbols(languageClient.code2ProtocolConverter, msg);
  }
  return vscode.commands.executeCommand(params.command, ...args);
};

const asDocumentSymbols = (converter: Code2ProtocolConverter, msg: unknown): lsprot.DocumentSymbol[] => {
  if (!Array.isArray(msg)) {
    return [];
  }
  return msg.map(item => asDocumentSymbol(converter, item));
};

const asDocumentSymbol = (converter: Code2ProtocolConverter, symbol: vscode.DocumentSymbol): lsprot.DocumentSymbol => {
  return {
    name: symbol.name,
    detail: symbol.detail,
    kind: converter.asSymbolKind(symbol.kind),
    range: converter.asRange(symbol.range),
    selectionRange: converter.asRange(symbol.selectionRange),
    children: asDocumentSymbols(converter, symbol.children),
    tags: symbol.tags ? converter.asSymbolTags(symbol.tags) : undefined
  };
};

const asWorkspaceSymbols = (converter: Code2ProtocolConverter, msg: unknown): lsprot.WorkspaceSymbol[] => {
  if (!Array.isArray(msg)) {
    return [];
  }
  return msg.map(item => converter.asWorkspaceSymbol(item));
};
