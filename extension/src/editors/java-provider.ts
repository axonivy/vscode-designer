import { CompletionItem, CompletionItemKind, CompletionList, Location, Position, Uri, workspace, type LocationLink } from 'vscode';
import { executeCommand } from '../base/commands';
import { logWarningMessage } from '../base/logging-util';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { treeUriToProjectPath } from '../project-explorer/tree-selection';

export class JavaProvider {
  readonly dummyJavaFile: Promise<Uri>;

  static readonly DUMMY_CLASS_NAME = 'Dummy';
  static readonly DUMMY_CONTENT = `private class ${JavaProvider.DUMMY_CLASS_NAME}{`;

  constructor(documentUri: Uri) {
    this.dummyJavaFile = treeUriToProjectPath(documentUri, IvyProjectExplorer.instance.getIvyProjects()).then(project =>
      Uri.joinPath(Uri.file(project ?? ''), 'target', 'java-provider', `java-provider.java`)
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
