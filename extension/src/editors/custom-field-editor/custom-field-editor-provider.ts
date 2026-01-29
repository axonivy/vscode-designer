import * as vscode from 'vscode';
import { registerOpenConfigEditorCmd } from '../command-helper';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CustomFieldEditorProvider {
  static readonly viewType = 'ivy.customFieldEditor';

  private constructor() {}

  static register(context: vscode.ExtensionContext) {
    registerOpenConfigEditorCmd('ivyEditor.openCustomFieldEditor', context, 'customfields.yaml');
  }
}
