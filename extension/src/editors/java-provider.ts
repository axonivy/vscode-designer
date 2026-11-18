import { CompletionItem, CompletionItemKind, CompletionList, Hover, Location, MarkdownString, Position, Uri, workspace, type LocationLink } from 'vscode';
import { executeCommand } from '../base/commands';
import { logWarningMessage } from '../base/logging-util';
import { IvyProjectManager } from '../project-explorer/ivy-project-manager';
import { treeUriToProjectPath } from '../project-explorer/tree-selection';
import { IVY_IMPORT, toJavaSourceContext } from './ivy-script-java-translation';

export class JavaProvider {
  readonly dummyJavaFile: Promise<Uri>;
  private ivyEnvironmentCompletionDocs: Promise<{ case?: string; task?: string }> | undefined;
  readonly dummyHoverJavaFile: Promise<Uri>;
  readonly dummyContextJavaFile: Promise<Uri>;
  readonly dummyDefinitionJavaFile: Promise<Uri>;

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
    this.dummyDefinitionJavaFile = projectPath.then(project =>
      Uri.joinPath(Uri.file(project ?? ''), 'target', 'java-provider', 'java-provider-definition.java')
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
    const source = toJavaSourceContext(code, position.character, imports);
    const importContent = source.imports.length > 0 ? `${source.imports.join('\n')}\n` : '';
    const javaFileContent = `${importContent}${JavaProvider.DUMMY_HOVER_CONTENT}${source.code}; } }`;
    await workspace.fs.writeFile(javaFile, Buffer.from(javaFileContent));
    const javaPosition = new Position(source.imports.length, JavaProvider.DUMMY_HOVER_CONTENT.length + source.character);
    const completionList = await executeCommand<CompletionList>(
      'vscode.executeCompletionItemProvider',
      javaFile,
      javaPosition,
      undefined,
      itemResolveCount
    );
    return completionList.items;
  }

  public ivyEnvironmentCompletionDocumentation() {
    this.ivyEnvironmentCompletionDocs ??= (async () => ({
      case: await this.hover('Ivy.wfCase()', new Position(0, 4), [IVY_IMPORT]),
      task: await this.hover('Ivy.wfTask()', new Position(0, 4), [IVY_IMPORT])
    }))().catch(() => ({}));
    return this.ivyEnvironmentCompletionDocs;
  }

  public async hover(toBeHovered: string, position: Position, imports: string[] = []) {
    const javaFile = await this.dummyHoverJavaFile;
    const source = toJavaSourceContext(toBeHovered, position.character, imports);
    const importContent = source.imports.length > 0 ? `${source.imports.join('\n')}\n` : '';
    const javaFileContent = `${importContent}${JavaProvider.DUMMY_HOVER_CONTENT}${source.code}; } }`;
    await workspace.fs.writeFile(javaFile, Buffer.from(javaFileContent));
    const javaPosition = new Position(source.imports.length, JavaProvider.DUMMY_HOVER_CONTENT.length + source.character);
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
    let typeName = fullyQualifiedName;
    if (!typeName.includes('.')) {
      const matchingType = (await this.javaTypes(typeName)).find(type => type.simpleName === typeName);
      typeName = matchingType?.fullQualifiedName || typeName;
    }
    const declarationPrefix = `class ${JavaProvider.DUMMY_CLASS_NAME} { `;
    const javaFileContent = `${declarationPrefix}${typeName} definition; }`;
    await workspace.fs.writeFile(javaFile, Buffer.from(javaFileContent));
    const locations = await executeCommand<Array<Location | LocationLink>>(
      'vscode.executeDefinitionProvider',
      javaFile,
      new Position(0, declarationPrefix.length + typeName.length)
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
    await this.openJavaLocation(location);
  }

  public async definitionAt(code: string, position: Position, imports: string[] = []) {
    const macroStart = code.lastIndexOf('<%=', position.character);
    const macroEnd = code.indexOf('%>', position.character);
    const isMacro = macroStart >= 0 && macroEnd >= 0;
    const source = isMacro ? code.slice(macroStart + 3, macroEnd) : code;
    const sourcePosition = isMacro ? new Position(0, position.character - macroStart - 3) : position;
    const javaSource = toJavaSourceContext(source, sourcePosition.character, imports);
    const javaFile = await this.dummyDefinitionJavaFile;
    const importContent = javaSource.imports.length > 0 ? `${javaSource.imports.join('\n')}\n` : '';
    const javaFileContent = `${importContent}${JavaProvider.DUMMY_HOVER_CONTENT}${javaSource.code}; } }`;
    await workspace.fs.writeFile(javaFile, Buffer.from(javaFileContent));
    const javaPosition = new Position(javaSource.imports.length, JavaProvider.DUMMY_HOVER_CONTENT.length + javaSource.character);
    const locations = await executeCommand<Array<Location | LocationLink> | undefined>(
      'vscode.executeDefinitionProvider',
      javaFile,
      javaPosition
    );
    return locations?.[0];
  }

  public async openDefinitionAt(code: string, position: Position, imports: string[] = []) {
    const location = await this.definitionAt(code, position, imports);
    if (!location) {
      return false;
    }
    await this.openJavaLocation(location);
    return true;
  }

  public async openJavaLocation(location: Location | LocationLink) {
    if (this.isLocation(location)) {
      await executeCommand('vscode.open', location.uri, { selection: location.range });
      return;
    }
    await executeCommand('vscode.open', location.targetUri, { selection: location.targetRange });
  }

  private toPrettyString = (locations: Array<Location | LocationLink>) =>
    locations.map(loc => (this.isLocation(loc) ? loc.uri.toString() : loc.targetUri.toString())).join(', ');

  private isLocation = (location: Location | LocationLink): location is Location => 'uri' in location;
}
