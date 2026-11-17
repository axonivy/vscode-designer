import { CompletionItem, CompletionItemKind, CompletionList, Hover, Location, MarkdownString, Position, Uri, workspace, type LocationLink } from 'vscode';
import { executeCommand } from '../base/commands';
import { logWarningMessage } from '../base/logging-util';
import { IvyProjectManager } from '../project-explorer/ivy-project-manager';
import { treeUriToProjectPath } from '../project-explorer/tree-selection';

export class JavaProvider {
  readonly dummyJavaFile: Promise<Uri>;
  readonly dummyHoverJavaFile: Promise<Uri>;
  readonly dummyContextJavaFile: Promise<Uri>;
  private readonly sourceAttachmentWarmups = new Map<string, Promise<void>>();

  static readonly DUMMY_CLASS_NAME = 'Dummy';
  static readonly DUMMY_CONTENT = `private class ${JavaProvider.DUMMY_CLASS_NAME}{`;
  static readonly DUMMY_HOVER_CONTENT = `class ${JavaProvider.DUMMY_CLASS_NAME} { void dummy() {`;

  constructor(documentUri: Uri) {
    const projectPath = treeUriToProjectPath(documentUri, IvyProjectManager.instance.getIvyProjects());
    this.dummyJavaFile = projectPath.then(project => Uri.joinPath(Uri.file(project ?? ''), 'target', 'java-provider', 'java-provider.java'));
    this.dummyHoverJavaFile = projectPath.then(project =>
      Uri.joinPath(Uri.file(project ?? ''), 'target', 'java-provider', 'java-provider-hover.java')
    );
    this.dummyContextJavaFile = projectPath.then(project =>
      Uri.joinPath(Uri.file(project ?? ''), 'target', 'java-provider', 'java-provider-context.java')
    );
  }

  public async completionItems(toBeCompleted: string, itemResolveCount?: number) {
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

  public async contextualCompletionItems(code: string, position: Position, imports: string[], itemResolveCount: number) {
    const javaFile = await this.dummyContextJavaFile;
    const importContent = imports.length > 0 ? `${imports.join('\n')}\n` : '';
    const javaFileContent = `${importContent}${JavaProvider.DUMMY_HOVER_CONTENT}${code}; } }`;
    await workspace.fs.writeFile(javaFile, Buffer.from(javaFileContent));

    const requestCompletionItems = async () => {
      const javaPosition = new Position(imports.length, JavaProvider.DUMMY_HOVER_CONTENT.length + position.character);
      const completionList = await executeCommand<CompletionList>(
        'vscode.executeCompletionItemProvider',
        javaFile,
        javaPosition,
        undefined,
        itemResolveCount
      );
      return completionList.items;
    };

    let items = await requestCompletionItems();
    const receiverPosition = this.memberReceiverPosition(code, position);
    if (!receiverPosition || !items.some(this.hasMissingMethodDocumentation)) {
      return items;
    }

    // JDT LS may attach Maven sources lazily on hover. Trigger that path for this receiver only,
    // then resolve completion items again instead of downloading sources for every dependency at import.
    const memberSeparator = code.lastIndexOf('.', position.character);
    const sourceKey = `${imports.join('\n')}\n${code.slice(0, memberSeparator).trim()}`;
    let sourceAttachmentWarmup = this.sourceAttachmentWarmups.get(sourceKey);
    if (!sourceAttachmentWarmup) {
      sourceAttachmentWarmup = this.hover(code, receiverPosition, imports).then(
        () => undefined,
        () => {
          this.sourceAttachmentWarmups.delete(sourceKey);
        }
      );
      this.sourceAttachmentWarmups.set(sourceKey, sourceAttachmentWarmup);
    }
    await sourceAttachmentWarmup;
    items = await requestCompletionItems();
    return items;
  }

  private hasMissingMethodDocumentation = (item: CompletionItem) => {
    if (item.kind !== CompletionItemKind.Method) {
      return false;
    }
    if (!item.documentation) {
      return true;
    }
    return item.documentation instanceof MarkdownString ? !item.documentation.value.trim() : !item.documentation.trim();
  };

  private memberReceiverPosition = (code: string, position: Position) => {
    const memberSeparator = code.lastIndexOf('.', position.character);
    if (memberSeparator <= 0) {
      return undefined;
    }
    let character = memberSeparator - 1;
    while (character >= 0 && /\s/.test(code[character] ?? '')) {
      character--;
    }
    return character < 0 ? undefined : new Position(position.line, character);
  };

  public async hover(toBeHovered: string, position: Position, imports: string[] = []) {
    const javaFile = await this.dummyHoverJavaFile;
    const importContent = imports.length > 0 ? `${imports.join('\n')}\n` : '';
    const javaFileContent = `${importContent}${JavaProvider.DUMMY_HOVER_CONTENT}${toBeHovered}; } }`;
    await workspace.fs.writeFile(javaFile, Buffer.from(javaFileContent));
    const javaPosition = new Position(imports.length, JavaProvider.DUMMY_HOVER_CONTENT.length + position.character);
    const hovers = await executeCommand<Hover[] | undefined>('vscode.executeHoverProvider', javaFile, javaPosition);
    const documentation = hovers?.flatMap(hover => hover.contents).map(content => {
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
