import path from 'path';
import {
  l10n,
  LanguageModelTextPart,
  type LanguageModelTool,
  type LanguageModelToolInvocationOptions,
  type LanguageModelToolInvocationPrepareOptions,
  LanguageModelToolResult,
  MarkdownString,
  type PreparedToolInvocation,
  Uri,
  workspace
} from 'vscode';
import { executeCommand } from '../../base/commands';
import { convertDialogFormToJsf as convertFormToJsf } from '../../editors/form-editor/convert-dialog-form';
import { IvyProjectManager } from '../../project-explorer/ivy-project-manager';
import { treeUriToProjectPath } from '../../project-explorer/tree-selection';

type ConvertDialogFormToJsfToolArgs = {
  formPath: string;
};

export class ConvertDialogFormToJsfTool implements LanguageModelTool<ConvertDialogFormToJsfToolArgs> {
  async invoke(options: LanguageModelToolInvocationOptions<ConvertDialogFormToJsfToolArgs>): Promise<LanguageModelToolResult> {
    const message = await convertDialogFormToJsf(options.input);
    return new LanguageModelToolResult([new LanguageModelTextPart(message)]);
  }

  prepareInvocation(options: LanguageModelToolInvocationPrepareOptions<ConvertDialogFormToJsfToolArgs>): PreparedToolInvocation {
    const formPath = options.input.formPath.trim();
    const confirmationLines = [`- ${l10n.t('Form')}: ${workspace.asRelativePath(Uri.file(formPath))}`];
    return {
      invocationMessage: l10n.t('Convert Dialog Form to JSF'),
      confirmationMessages: {
        title: l10n.t('Convert Dialog Form to JSF'),
        message: new MarkdownString(confirmationLines.join('\n'))
      }
    };
  }
}

export const convertDialogFormToJsf = async (input: ConvertDialogFormToJsfToolArgs): Promise<string> => {
  const { formUri, projectPath } = await resolveDialogForm(input.formPath);
  const viewUri = await convertFormToJsf(projectPath, formUri);
  await executeCommand('vscode.open', viewUri);
  return l10n.t("Dialog Form converted to JSF:\n- View: '{0}'\n- Removed Form: '{1}'", viewUri.fsPath, formUri.fsPath);
};

const resolveDialogForm = async (formPath: string) => {
  const trimmedPath = formPath.trim();
  if (!path.basename(trimmedPath).endsWith('.f.json')) {
    throw new Error(l10n.t('The file must be a .f.json file.'));
  }

  const formUri = Uri.file(trimmedPath);
  const projectPath = await treeUriToProjectPath(formUri, IvyProjectManager.instance.getIvyProjects());
  if (!projectPath) {
    throw new Error(l10n.t('The selected dialog form does not belong to an Axon Ivy project: {0}', trimmedPath));
  }
  return { formUri, projectPath };
};
