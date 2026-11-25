import { DisposableCollection } from '@eclipse-glsp/vscode-integration';
import { commands, Position, Range, Uri, workspace } from 'vscode';
import type { Messenger } from 'vscode-messenger';
import type { MessageParticipant, RequestType } from 'vscode-messenger-common';
import { JavaProvider } from './java-provider';
import { macroScriptAtPosition } from './ivy-macro-context';

type SourcePosition = { line: number; character: number };
type SourceRange = { start: SourcePosition; end: SourcePosition };
type DefinitionTarget = { uri: string; range: SourceRange; selectionRange: SourceRange; text?: string };

const ResolveDefinitionRequest: RequestType<{ code: string; position: SourcePosition; languageId?: string }, DefinitionTarget[]> = {
  method: 'definition/resolve'
};
const OpenDefinitionRequest: RequestType<{ uri: string; range?: SourceRange }, void> = { method: 'definition/open' };

const toSourceRange = (range: Range): SourceRange => ({
  start: { line: range.start.line, character: range.start.character },
  end: { line: range.end.line, character: range.end.character }
});

export const registerDefinitionNavigation = (messenger: Messenger, participant: MessageParticipant, documentUri: Uri) => {
  const java = new JavaProvider(documentUri);
  return new DisposableCollection(
    messenger.onRequest(
      ResolveDefinitionRequest,
      async ({ code: script, position: cursor, languageId }) => {
        if (languageId === 'ivyMacro') {
          const expression = macroScriptAtPosition(script, cursor);
          if (!expression) {
            return [];
          }
          script = expression.code;
          cursor = expression.position;
        }
        const lines = script.split(/\r\n|\n|\r/);
        const isImport = (line: string) => /^\s*import\s+(?:static\s+)?[\w.$*]+\s*;\s*$/.test(line);
        const imports = lines.filter(isImport);
        // Keep declarations and line numbers, but move imports outside the dummy class.
        let code = lines.map(line => (isImport(line) ? '' : line)).join('\n');
        let position = new Position(cursor.line, cursor.character);
        const currentLine = lines[cursor.line] ?? '';
        if (isImport(currentLine)) {
          const prefix = /^\s*import\s+(?:static\s+)?/.exec(currentLine)?.[0] ?? '';
          code = currentLine.slice(prefix.length);
          position = new Position(0, Math.max(cursor.character - prefix.length, 0));
        }
        const locations = await java.definition(code, position, imports).catch(() => []);
        return Promise.all(
          locations.map(async location => {
            const uri = 'uri' in location ? location.uri : location.targetUri;
            const range = 'uri' in location ? location.range : location.targetRange;
            const selectionRange = 'uri' in location ? location.range : (location.targetSelectionRange ?? range);
            // Monaco needs a target model for its native Cmd/Ctrl-hover source preview.
            // Reading a document does not activate an editor or navigate away from the inscription.
            const source = await Promise.resolve(workspace.openTextDocument(uri)).catch(() => undefined);
            return {
              uri: uri.toString(),
              range: toSourceRange(range),
              selectionRange: toSourceRange(selectionRange),
              text: source?.getText()
            };
          })
        );
      },
      { sender: participant }
    ),
    messenger.onRequest(
      OpenDefinitionRequest,
      async ({ uri, range }) => {
        const selection = range
          ? new Range(new Position(range.start.line, range.start.character), new Position(range.end.line, range.end.character))
          : undefined;
        await commands.executeCommand('vscode.open', Uri.parse(uri), { selection });
      },
      { sender: participant }
    )
  );
};
