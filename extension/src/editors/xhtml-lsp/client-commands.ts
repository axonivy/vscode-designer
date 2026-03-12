import * as vscode from 'vscode';
import { Converter } from 'vscode-languageclient/lib/common/codeConverter';
import { ExecuteCommandParams, LanguageClient } from 'vscode-languageclient/node';
import * as lsprot from 'vscode-languageserver-protocol';

export async function onExecuteClientCommand(languageClient: LanguageClient, params: ExecuteCommandParams): Promise<unknown> {
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
  return undefined;
}

function asDocumentSymbols(converter: Converter, msg: unknown): lsprot.DocumentSymbol[] {
  if (msg == null || msg == undefined || !Array.isArray(msg) || msg.length === 0) {
    return [];
  }
  return msg.map(item => asDocumentSymbol(converter, item));
}

function asDocumentSymbol(converter: Converter, symbol: vscode.DocumentSymbol): lsprot.DocumentSymbol {
  //const range = client.code2ProtocolConverter.asRange(symbol.range);
  const sym = {
    name: symbol.name,
    detail: symbol.detail,
    kind: converter.asSymbolKind(symbol.kind),
    range: converter.asRange(symbol.range),
    selectionRange: converter.asRange(symbol.selectionRange),
    children: asDocumentSymbols(converter, symbol.children)
  } as lsprot.DocumentSymbol;
  if (symbol.tags) {
    sym.tags = converter.asSymbolTags(symbol.tags);
  }
  return sym;
}

function asWorkspaceSymbols(converter: Converter, msg: unknown): lsprot.WorkspaceSymbol[] {
  if (msg == null || msg == undefined || !Array.isArray(msg) || msg.length === 0) {
    return [];
  }
  return msg.map(item => converter.asWorkspaceSymbol(item));
}
