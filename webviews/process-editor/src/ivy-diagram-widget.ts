import { DiagramLoadingOptions, Args } from '@eclipse-glsp/client';
import { GLSPDiagramIdentifier, GLSPDiagramWidget } from '@eclipse-glsp/vscode-integration-webview';
import { inject, injectable } from 'inversify';
import type { ProcessEditorDiagramIdentifier } from './app';

@injectable()
export class IvyDiagramWidget extends GLSPDiagramWidget {
  @inject(GLSPDiagramIdentifier)
  protected diagramIdentifier: ProcessEditorDiagramIdentifier;

  protected override createDiagramLoadingOptions(): DiagramLoadingOptions | undefined {
    const requestModelOptions: Args = {};
    if (this.diagramIdentifier.diff) {
      requestModelOptions.diffId = this.diagramIdentifier.diff.id;
      requestModelOptions.diffSide = this.diagramIdentifier.diff.side;
      requestModelOptions.diffContent = this.diagramIdentifier.diff.content;
    }
    return {
      requestModelOptions
    };
  }
}
