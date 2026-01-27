import * as vscode from 'vscode';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { treeUriToProjectPath } from '../project-explorer/tree-selection';

export class JavaCompletion {
  readonly dummyJavaFile: Promise<vscode.Uri>;
  readonly itemResolveCount = 50;

  constructor(document: vscode.TextDocument, id: string) {
    this.dummyJavaFile = treeUriToProjectPath(document.uri, IvyProjectExplorer.instance.getIvyProjects()).then(project =>
      vscode.Uri.joinPath(vscode.Uri.file(project ?? ''), 'target', 'completion', `${id}.java`)
    );
  }

  public async types(toBeCompleted: string) {
    const javaFile = await this.dummyJavaFile;
    await vscode.workspace.fs.writeFile(javaFile, Buffer.from(`class Dummy{${toBeCompleted}}`));
    const completionList = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      javaFile,
      new vscode.Position(0, 12 + toBeCompleted.length)
    );
    return completionList.items
      .filter(item => item.kind === vscode.CompletionItemKind.Class || item.kind === vscode.CompletionItemKind.Interface)
      .slice(0, this.itemResolveCount);
  }
}
