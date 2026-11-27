import { MonacoUtil } from '@axonivy/process-editor-inscription-view';
import { HOST_EXTENSION, type RequestType } from 'vscode-messenger-common';
import type { Messenger } from 'vscode-messenger-webview';

type SourcePosition = { line: number; character: number };
type SourceRange = { start: SourcePosition; end: SourcePosition };
type DefinitionTarget = { uri: string; range: SourceRange; selectionRange: SourceRange; text?: string };

const ResolveDefinitionRequest: RequestType<{ code: string; position: SourcePosition; languageId?: string; uri?: string }, DefinitionTarget[]> = {
  method: 'definition/resolve'
};
const OpenDefinitionRequest: RequestType<{ uri: string; range?: SourceRange }, void> = { method: 'definition/open' };

export const setupDefinitionNavigation = async (messenger: Messenger) => {
  const monaco = await MonacoUtil.monaco();
  const previews = new Map<string, ReturnType<typeof monaco.editor.createModel>>();
  const toRange = (range: SourceRange) =>
    new monaco.Range(range.start.line + 1, range.start.character + 1, range.end.line + 1, range.end.character + 1);
  // Use the public provider API rather than the LSP adapter, which only accepts
  // locations backed by its own managed webview models.
  const provider = monaco.languages.registerDefinitionProvider(['ivyScript', 'ivyMacro'], {
    async provideDefinition(model, position, token) {
      const version = model.getVersionId();
      const targets = await messenger.sendRequest(ResolveDefinitionRequest, HOST_EXTENSION, {
        code: model.getValue(),
        uri: model.uri.toString(),
        languageId: model.getLanguageId(),
        position: { line: position.lineNumber - 1, character: position.column - 1 }
      });
      if (token.isCancellationRequested || model.isDisposed() || version !== model.getVersionId()) {
        return [];
      }
      const word = model.getWordAtPosition(position);
      return targets.map(target => {
        const uri = monaco.Uri.parse(target.uri);
        if (target.text !== undefined) {
          const preview = monaco.editor.getModel(uri);
          if (!preview) {
            // Bound the source-preview cache to this webview's recent navigation targets.
            const oldest = previews.size >= 20 ? previews.entries().next().value : undefined;
            if (oldest) {
              oldest[1].dispose();
              previews.delete(oldest[0]);
            }
            previews.set(target.uri, monaco.editor.createModel(target.text, target.uri.endsWith('.d.json') ? 'json' : 'java', uri));
          } else if (previews.has(target.uri) && preview.getValue() !== target.text) {
            preview.setValue(target.text);
          }
        }
        return {
          uri,
          range: toRange(target.range),
          targetSelectionRange: toRange(target.selectionRange),
          originSelectionRange: word
            ? new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn)
            : undefined
        };
      });
    }
  });
  const opener = monaco.editor.registerEditorOpener({
    async openCodeEditor(source, resource, selection) {
      // Let Monaco navigate within the current inscription itself.
      if (resource.toString() === source.getModel()?.uri.toString()) {
        return false;
      }
      const range = selection
        ? 'startLineNumber' in selection
          ? {
              start: { line: selection.startLineNumber - 1, character: selection.startColumn - 1 },
              end: { line: selection.endLineNumber - 1, character: selection.endColumn - 1 }
            }
          : {
              start: { line: selection.lineNumber - 1, character: selection.column - 1 },
              end: { line: selection.lineNumber - 1, character: selection.column - 1 }
            }
        : undefined;
      await messenger.sendRequest(OpenDefinitionRequest, HOST_EXTENSION, { uri: resource.toString(), range });
      return true;
    }
  });
  return {
    dispose() {
      provider.dispose();
      opener.dispose();
      previews.forEach(model => model.dispose());
      previews.clear();
    }
  };
};
