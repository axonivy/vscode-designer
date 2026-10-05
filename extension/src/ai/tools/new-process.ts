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
import { localizeProcessKind } from '../../base/localized-labels';
import { IvyEngineManager } from '../../engine/engine-manager';

type NewProcessToolArgs = {
  name: string;
  namespace?: string;
  projectPath: string;
  type?: ProcessType;
};
type ProcessType = 'Business Process' | 'Callable Sub Process' | 'Web Service Process';

export class NewProcessTool implements LanguageModelTool<NewProcessToolArgs> {
  async invoke(options: LanguageModelToolInvocationOptions<NewProcessToolArgs>): Promise<LanguageModelToolResult> {
    const message = await createNewProcess(options.input);
    return Promise.resolve(new LanguageModelToolResult([new LanguageModelTextPart(message)]));
  }

  prepareInvocation?(options: LanguageModelToolInvocationPrepareOptions<NewProcessToolArgs>): ProviderResult<PreparedToolInvocation> {
    const type = resolvedType(options.input.type);
    const confirmationMessage = [
      l10n.t('Create an Axon Ivy {0} with the following details?', localizeProcessKind(type)),
      `- ${l10n.t('Name')}: ${options.input.name}`,
      `- ${l10n.t('Namespace')}: ${options.input.namespace ?? ''}`,
      `- ${l10n.t('Project')}: ${path.basename(options.input.projectPath)}`
    ].join('\n');
    return {
      invocationMessage: l10n.t('Creating new Axon Ivy {0} "{1}"', localizeProcessKind(type), options.input.name),
      confirmationMessages: {
        title: l10n.t('New Axon Ivy {0}', localizeProcessKind(type)),
        message: new MarkdownString(confirmationMessage)
      }
    };
  }
}

export const createNewProcess = async (input: NewProcessToolArgs): Promise<string> => {
  const type = resolvedType(input.type);
  const newProcessParams = {
    name: input.name,
    namespace: input.namespace ?? '',
    path: input.projectPath,
    kind: type
  };
  const processBean = await IvyEngineManager.instance.createProcess(newProcessParams);
  const processPath = processBean?.uri ? Uri.parse(processBean.uri).fsPath : '<unknown location>';
  return l10n.t("{0} created successfully at '{1}'", localizeProcessKind(type), processPath);
};

const resolvedType = (type?: ProcessType) => type ?? 'Business Process';
