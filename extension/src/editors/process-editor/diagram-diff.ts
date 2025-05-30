import * as vscode from 'vscode';

export const DIAGRAM_DIFF_EXTENSION = '.pdiff';

let diffIdCounter = 0;
export function configureDiagramDiffCommand(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('ivy.glspDiagram.diff', () => {
      const diffId = `pdiff-${diffIdCounter++}`;
      const activeTab = vscode.window.tabGroups.activeTabGroup?.activeTab;
      if (activeTab?.input instanceof vscode.TabInputTextDiff) {
        const leftDiff: DiagramDiff = { diffId, side: 'left', uri: activeTab.input.original };
        const rightDiff: DiagramDiff = { diffId, side: 'right', uri: activeTab.input.modified };
        const leftUri = toDiagramDiffUri(leftDiff);
        const rightUri = toDiagramDiffUri(rightDiff);
        vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, activeTab.label);
      }
    })
  );
}

export interface DiagramDiff {
  diffId: string;
  side: 'left' | 'right';
  uri: vscode.Uri;
}

export function getDiagramDiffFromUri(uri: vscode.Uri): DiagramDiff | undefined {
  const queryParams = new URLSearchParams(uri.query);
  const diffId = queryParams.get('diffId');
  const side = queryParams.get('side') as 'left' | 'right' | null;
  const uriString = queryParams.get('uri');
  if (diffId && side && uriString) {
    const decodedUriStr = decodeURIComponent(uriString);
    const decodedUri = vscode.Uri.parse(decodedUriStr);
    return {
      diffId,
      side,
      uri: decodedUri
    };
  }
  return undefined;
}

export function toDiagramDiffUri(diff: DiagramDiff): vscode.Uri {
  const queryParams = new URLSearchParams();
  queryParams.append('diffId', diff.diffId);
  queryParams.append('side', diff.side);
  queryParams.append('uri', diff.uri.toString());
  return vscode.Uri.from({ scheme: 'file', path: `${diff.side}.pdiff`, query: queryParams.toString() });
}
