import path from 'path';
import {
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
import type { HdInit } from '../../engine/api/generated/client';
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
    let confirmationMessage = `Create an Axon Ivy ${newDialogParams.type} Dialog with the following details?\n- Name: ${newDialogParams.name}\n- Namespace: ${newDialogParams.namespace}\n- Project: ${path.basename(newDialogParams.projectDir ?? '')}`;
    if (newDialogParams.type === 'JSF') {
      confirmationMessage += `\n- Layout: ${newDialogParams.layout}`;
      if (newDialogParams.layout !== 'Component') {
        confirmationMessage += `\n- Template: ${newDialogParams.template}`;
      }
    }
    return {
      invocationMessage: `Creating new Axon Ivy ${newDialogParams.type} Dialog "${newDialogParams.name}"`,
      confirmationMessages: {
        title: `New Axon Ivy ${newDialogParams.type} Dialog`,
        message: new MarkdownString(confirmationMessage)
      }
    };
  }
}

export const createNewDialog = async (input: NewDialogToolArgs): Promise<string> => {
  const newDialogParams = resolvedParams(input);
  const hdBean = await IvyEngineManager.instance.createUserDialog(newDialogParams);
  const dialogPath = hdBean?.uri ? Uri.parse(hdBean.uri).fsPath : '<unknown location>';
  return `${newDialogParams.type} Dialog created successfully at '${dialogPath}'`;
};

const resolvedParams = (args: NewDialogToolArgs) => {
  const params: HdInit = {
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
