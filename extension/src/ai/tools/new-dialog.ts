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
  type ProviderResult,
  Uri
} from 'vscode';
import { localizeDialogLayout, localizeDialogType } from '../../base/localized-labels';
import type { CreateUserDialogParams } from '../../engine/api/engine-api';
import { IvyEngineManager } from '../../engine/engine-manager';

type NewDialogToolArgs = {
  name: string;
  namespace: string;
  projectPath: string;
  type?: DialogType;
  layout?: DialogLayout;
  template?: DialogTemplate;
};
type DialogType = 'Form' | 'JSF' | 'JSFOffline';
type DialogLayout =
  | 'Page Responsive Grid 2 Columns'
  | 'Page Responsive Grid 4 Columns'
  | 'Page Responsive Top Labels'
  | 'Page Panel Grid'
  | 'Component';
type DialogTemplate = 'basic-10' | 'frame-10' | 'frame-10-right' | 'frame-10-full-width';

export class NewDialogTool implements LanguageModelTool<NewDialogToolArgs> {
  async invoke(options: LanguageModelToolInvocationOptions<NewDialogToolArgs>): Promise<LanguageModelToolResult> {
    const message = await createNewDialog(options.input);
    return Promise.resolve(new LanguageModelToolResult([new LanguageModelTextPart(message)]));
  }

  prepareInvocation?(options: LanguageModelToolInvocationPrepareOptions<NewDialogToolArgs>): ProviderResult<PreparedToolInvocation> {
    const newDialogParams = resolvedParams(options.input);
    const dialogType = newDialogParams.type ?? 'Form';
    const confirmationLines = [
      l10n.t('Create an Axon Ivy {0} with the following details?', localizeDialogType(dialogType)),
      `- ${l10n.t('Name')}: ${newDialogParams.name}`,
      `- ${l10n.t('Namespace')}: ${newDialogParams.namespace}`,
      `- ${l10n.t('Project')}: ${path.basename(newDialogParams.projectDir ?? '')}`
    ];
    if (dialogType === 'JSF') {
      confirmationLines.push(`- ${l10n.t('Layout')}: ${localizeDialogLayout(newDialogParams.layout ?? '')}`);
      if (newDialogParams.layout !== 'Component') {
        confirmationLines.push(`- ${l10n.t('Template')}: ${newDialogParams.template ?? ''}`);
      }
    }
    const confirmationMessage = confirmationLines.join('\n');
    return {
      invocationMessage: l10n.t('Creating new Axon Ivy {0} "{1}"', localizeDialogType(dialogType), newDialogParams.name),
      confirmationMessages: {
        title: l10n.t('New Axon Ivy {0}', localizeDialogType(dialogType)),
        message: new MarkdownString(confirmationMessage)
      }
    };
  }
}

export const createNewDialog = async (input: NewDialogToolArgs): Promise<string> => {
  const newDialogParams = resolvedParams(input);
  const dialogType = newDialogParams.type ?? 'Form';
  const hdBean = await IvyEngineManager.instance.createUserDialog(newDialogParams);
  const dialogPath = hdBean?.uri ? Uri.parse(hdBean.uri).fsPath : '<unknown location>';
  return l10n.t("{0} created successfully at '{1}'", localizeDialogType(dialogType), dialogPath);
};

const resolvedParams = (args: NewDialogToolArgs) => {
  const params: CreateUserDialogParams = {
    name: args.name,
    namespace: args.namespace,
    projectDir: args.projectPath,
    type: args.type ?? 'Form'
  };
  if (params.type === 'JSF') {
    params.layout = args.layout ?? 'Page Responsive Grid 2 Columns';
    if (params.layout !== 'Component') {
      params.template = args.template ?? 'basic-10';
    }
  }
  if (params.type === 'JSFOffline') {
    params.layout = 'Page';
  }
  return params;
};
