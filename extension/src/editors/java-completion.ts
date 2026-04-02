import { CompletionItem, CompletionItemKind, CompletionList, Position, Uri, commands, workspace } from 'vscode';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { treeUriToProjectPath } from '../project-explorer/tree-selection';

export class JavaCompletion {
  readonly dummyJavaFile: Promise<Uri>;
  static readonly DUMMY_CLASS_NAME = 'Dummy';
  static readonly DUMMY_CONTENT_OFFSET = `private class ${JavaCompletion.DUMMY_CLASS_NAME}{`.length;

  constructor(documentUri: Uri, id: string) {
    this.dummyJavaFile = treeUriToProjectPath(documentUri, IvyProjectExplorer.instance.getIvyProjects()).then(project =>
      Uri.joinPath(Uri.file(project ?? ''), 'target', 'completion', `${id}.java`)
    );
  }

  public async completionItems(toBeCompleted: string, itemResolveCount?: number) {
    const javaFile = await this.dummyJavaFile;
    await workspace.fs.writeFile(javaFile, Buffer.from(`private class ${JavaCompletion.DUMMY_CLASS_NAME}{${toBeCompleted}}`));
    const completionList = await commands.executeCommand<CompletionList>(
      'vscode.executeCompletionItemProvider',
      javaFile,
      new Position(0, JavaCompletion.DUMMY_CONTENT_OFFSET + toBeCompleted.length),
      undefined,
      itemResolveCount // resolve javadoc for count items - large number will slow down completion
    );
    return completionList.items
      .filter(
        item =>
          item.kind === CompletionItemKind.Class || item.kind === CompletionItemKind.Interface || item.kind === CompletionItemKind.Enum
      )
      .filter(item => item.detail !== JavaCompletion.DUMMY_CLASS_NAME);
  }

  public async javaTypes(toBeCompleted: string) {
    return (await this.completionItems(toBeCompleted)).map(item => this.toJavaType(item));
  }

  toJavaType = (item: CompletionItem) => {
    const simpleName = typeof item.label === 'string' ? item.label : (item.label.label ?? '');
    const packageName = typeof item.label === 'string' ? '' : (item.label.description ?? '');
    const fullQualifiedName = item.detail ?? '';
    return { simpleName, packageName, fullQualifiedName };
  };
}
