import * as vscode from 'vscode';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { treeUriToProjectPath } from '../project-explorer/tree-selection';

export class JavaCompletion {
  readonly dummyJavaFile: Promise<vscode.Uri>;
  static readonly ITEM_RESOLVE_COUNT = 50;
  static readonly DUMMY_CLASS_NAME = 'Dummy';

  constructor(documentUri: vscode.Uri, id: string) {
    this.dummyJavaFile = treeUriToProjectPath(documentUri, IvyProjectExplorer.instance.getIvyProjects()).then(project =>
      vscode.Uri.joinPath(vscode.Uri.file(project ?? ''), 'target', 'completion', `${id}.java`)
    );
  }

  public async completionItems(toBeCompleted: string) {
    const javaFile = await this.dummyJavaFile;
    await vscode.workspace.fs.writeFile(javaFile, Buffer.from(`private class ${JavaCompletion.DUMMY_CLASS_NAME}{${toBeCompleted}}`));
    const completionList = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      javaFile,
      new vscode.Position(0, 20 + toBeCompleted.length)
    );
    return completionList.items
      .filter(item => item.kind === vscode.CompletionItemKind.Class || item.kind === vscode.CompletionItemKind.Interface)
      .filter(item => item.detail !== JavaCompletion.DUMMY_CLASS_NAME)
      .slice(0, JavaCompletion.ITEM_RESOLVE_COUNT);
  }

  public async javaTypes(toBeCompleted: string) {
    return (await this.completionItems(toBeCompleted)).map(item => this.toJavaType(item));
  }

  toJavaType = (item: vscode.CompletionItem) => {
    const simpleName = typeof item.label === 'string' ? item.label : (item.label.label ?? '');
    const packageName = typeof item.label === 'string' ? '' : (item.label.description ?? '');
    const fullQualifiedName = item.detail ?? '';
    return { simpleName, packageName, fullQualifiedName };
  };
}
