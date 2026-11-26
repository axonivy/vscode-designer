import {
  CompletionItem,
  CompletionItemKind,
  CompletionList,
  Hover,
  Location,
  MarkdownString,
  Position,
  Range,
  Uri,
  workspace,
  WorkspaceEdit,
  type LocationLink
} from 'vscode';
import { executeCommand } from '../../base/commands';
import { logWarningMessage } from '../../base/logging-util';
import { IvyProjectManager } from '../../project-explorer/ivy-project-manager';
import { treeUriToProjectPath } from '../../project-explorer/tree-selection';
import { toJavaIvyContext } from './ivy-script-java-translation';

export class JavaProvider {
  private static completionQueue: Promise<unknown> = Promise.resolve();

  private enqueueCompletion<T>(request: () => Promise<T>): Promise<T> {
    // JDT completion resolution uses a shared proposal cache, even across different files.
    // Keep each completion request and all of its documentation resolution together.
    const result = JavaProvider.completionQueue.then(request);
    JavaProvider.completionQueue = result.catch(() => undefined);
    return result;
  }

  readonly dummyJavaFile: Promise<Uri>;
  readonly dummyHoverJavaFile: Promise<Uri>;
  readonly dummyContextJavaFile: Promise<Uri>;
  readonly dummyDefinitionJavaFile: Promise<Uri>;

  static readonly DUMMY_CLASS_NAME = 'Dummy';
  static readonly DUMMY_CONTENT = `private class ${JavaProvider.DUMMY_CLASS_NAME}{`;
  static readonly DUMMY_HOVER_CONTENT = `class ${JavaProvider.DUMMY_CLASS_NAME} { void dummy() {`;

  constructor(documentUri: Uri) {
    const projectPath = treeUriToProjectPath(documentUri, IvyProjectManager.instance.getIvyProjects());
    this.dummyJavaFile = projectPath.then(project =>
      Uri.joinPath(Uri.file(project ?? ''), 'target', 'java-provider', 'java-provider.java')
    );
    this.dummyHoverJavaFile = projectPath.then(project =>
      Uri.joinPath(Uri.file(project ?? ''), 'target', 'java-provider', 'java-provider-hover.java')
    );
    this.dummyContextJavaFile = projectPath.then(project =>
      Uri.joinPath(Uri.file(project ?? ''), 'target', 'java-provider', 'java-provider-context.java')
    );
    this.dummyDefinitionJavaFile = projectPath.then(project =>
      Uri.joinPath(Uri.file(project ?? ''), 'target', 'java-provider', 'java-provider-definition.java')
    );
  }

  public completionItems(toBeCompleted: string, itemResolveCount?: number) {
    return this.enqueueCompletion(() => this.provideCompletionItems(toBeCompleted, itemResolveCount));
  }

  private async provideCompletionItems(toBeCompleted: string, itemResolveCount?: number) {
    const javaFile = await this.dummyJavaFile;
    const javaFileContent = `${JavaProvider.DUMMY_CONTENT}${toBeCompleted}`;
    await workspace.fs.writeFile(javaFile, Buffer.from(javaFileContent));
    const completionList = await executeCommand<CompletionList>(
      'vscode.executeCompletionItemProvider',
      javaFile,
      new Position(0, javaFileContent.length),
      undefined,
      itemResolveCount // resolve javadoc for count items - large number will slow down completion
    );
    return completionList.items
      .filter(
        item =>
          item.kind === CompletionItemKind.Class || item.kind === CompletionItemKind.Interface || item.kind === CompletionItemKind.Enum
      )
      .filter(item => item.detail !== JavaProvider.DUMMY_CLASS_NAME);
  }

  public contextualCompletionItems(code: string, position: Position, imports: string[], itemResolveCount: number) {
    return this.enqueueCompletion(() => this.provideContextualCompletionItems(code, position, imports, itemResolveCount));
  }

  private async provideContextualCompletionItems(code: string, position: Position, imports: string[], itemResolveCount: number) {
    const javaFile = await this.dummyContextJavaFile;
    const translated = toJavaIvyContext(code, position, imports);
    const importContent = translated.imports.length > 0 ? `${translated.imports.join('\n')}\n` : '';
    const javaFileContent = `${importContent}${JavaProvider.DUMMY_HOVER_CONTENT}${translated.code}; } }`;
    await workspace.fs.writeFile(javaFile, Buffer.from(javaFileContent));
    const javaPosition = new Position(
      translated.imports.length + translated.position.line,
      JavaProvider.DUMMY_HOVER_CONTENT.length + translated.position.character
    );
    const completionList = await executeCommand<CompletionList>(
      'vscode.executeCompletionItemProvider',
      javaFile,
      javaPosition,
      undefined,
      itemResolveCount
    );
    return completionList.items;
  }

  public async hover(toBeHovered: string, position: Position, imports: string[] = []) {
    const javaFile = await this.dummyHoverJavaFile;
    const translated = toJavaIvyContext(toBeHovered, position, imports);
    const importContent = translated.imports.length > 0 ? `${translated.imports.join('\n')}\n` : '';
    const javaFileContent = `${importContent}${JavaProvider.DUMMY_HOVER_CONTENT}${translated.code}; } }`;
    await workspace.fs.writeFile(javaFile, Buffer.from(javaFileContent));
    const javaPosition = new Position(
      translated.imports.length + translated.position.line,
      JavaProvider.DUMMY_HOVER_CONTENT.length + translated.position.character
    );
    const hovers = await executeCommand<Hover[] | undefined>('vscode.executeHoverProvider', javaFile, javaPosition);
    const documentation = hovers
      ?.flatMap(hover => hover.contents)
      .map(content => {
        if (typeof content === 'string') {
          return content;
        }
        if (content instanceof MarkdownString) {
          return content.value;
        }
        return `\`\`\`${content.language}\n${content.value}\n\`\`\``;
      });
    const result = documentation?.filter(Boolean).join('\n\n');
    return result || undefined;
  }

  public definition(code: string, position: Position, imports: string[] = []) {
    return this.enqueueCompletion(async () => {
      const javaFile = await this.dummyDefinitionJavaFile;
      const translated = toJavaIvyContext(code, position, imports);
      const importContent = translated.imports.length > 0 ? `${translated.imports.join('\n')}\n` : '';
      const javaFileContent = `${importContent}${JavaProvider.DUMMY_HOVER_CONTENT}${translated.code}; } }`;
      // executeDefinitionProvider reuses an already-open text document. File watcher updates
      // are asynchronous, so a disk write alone can leave JDT querying the previous script.
      let document = workspace.textDocuments.find(doc => doc.uri.toString() === javaFile.toString());
      if (!document) {
        await workspace.fs.writeFile(javaFile, Buffer.from(javaFileContent));
        document = await workspace.openTextDocument(javaFile);
      }
      const needsUpdate = document.getText() !== javaFileContent;
      if (needsUpdate) {
        const edit = new WorkspaceEdit();
        edit.replace(javaFile, new Range(document.positionAt(0), document.positionAt(document.getText().length)), javaFileContent);
        if (!(await workspace.applyEdit(edit))) {
          throw new Error('Could not synchronize the Java definition document');
        }
      }
      const javaPosition = new Position(
        translated.imports.length + translated.position.line,
        (translated.position.line === 0 ? JavaProvider.DUMMY_HOVER_CONTENT.length : 0) + translated.position.character
      );
      try {
        const locations = await executeCommand<Array<Location | LocationLink> | undefined>(
          'vscode.executeDefinitionProvider',
          javaFile,
          javaPosition
        );
        // Synthetic local variables are not useful navigation targets.
        return (locations ?? []).filter(
          location => (this.isLocation(location) ? location.uri : location.targetUri).toString() !== javaFile.toString()
        );
      } finally {
        // Save only after querying: format-on-save and organize-imports can move the cursor.
        // Persist the hidden document so it does not leave an unsaved editor behind.
        if (needsUpdate) {
          await document.save();
        }
      }
    });
  }

  public async javaTypes(toBeCompleted: string) {
    return (await this.completionItems(toBeCompleted)).map(item => this.toJavaType(item));
  }

  private toJavaType = (item: CompletionItem) => {
    const simpleName = typeof item.label === 'string' ? item.label : (item.label.label ?? '');
    const packageName = typeof item.label === 'string' ? '' : (item.label.description ?? '');
    const fullQualifiedName = item.detail ?? '';
    return { simpleName, packageName, fullQualifiedName };
  };

  public async openDefinition(fullyQualifiedName: string) {
    const javaFile = await this.dummyJavaFile;
    const javaFileContent = `${JavaProvider.DUMMY_CONTENT}${fullyQualifiedName}`;
    await workspace.fs.writeFile(javaFile, Buffer.from(javaFileContent));
    const locations = await executeCommand<Array<Location | LocationLink>>(
      'vscode.executeDefinitionProvider',
      javaFile,
      new Position(0, javaFileContent.length)
    );
    if (locations.length > 1) {
      logWarningMessage(
        `Failed to open Java file. Multiple definitions found for '${fullyQualifiedName}': ${this.toPrettyString(locations)}`
      );
      return;
    }
    const location = locations[0];
    if (!location) {
      logWarningMessage(`Failed to open Java file. No definition found for: ${fullyQualifiedName}`);
      return;
    }
    if (this.isLocation(location)) {
      executeCommand('vscode.open', location.uri, { selection: location.range });
      return;
    }
    executeCommand('vscode.open', location.targetUri, { selection: location.targetRange });
  }

  private toPrettyString = (locations: Array<Location | LocationLink>) =>
    locations.map(loc => (this.isLocation(loc) ? loc.uri.toString() : loc.targetUri.toString())).join(', ');

  private isLocation = (location: Location | LocationLink): location is Location => 'uri' in location;
}
