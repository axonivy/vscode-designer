import * as vscode from 'vscode';
import { registerOpenConfigEditorCmd } from '../command-helper';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class WebServiceEditorProvider {
  static readonly viewType = 'ivy.webServiceEditor';

  private constructor() {}

  static register(context: vscode.ExtensionContext) {
    registerOpenConfigEditorCmd('ivyEditor.openWebServiceEditor', context, 'webservices.yaml');
  }
}
