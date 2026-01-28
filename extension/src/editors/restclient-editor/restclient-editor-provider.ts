import * as vscode from 'vscode';
import { registerOpenConfigEditorCmd } from '../command-helper';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RestClientEditorProvider {
  static readonly viewType = 'ivy.restClientEditor';

  private constructor() {}

  static register(context: vscode.ExtensionContext) {
    registerOpenConfigEditorCmd('ivyEditor.openRestClientEditor', context, 'restclients.yaml');
  }
}
