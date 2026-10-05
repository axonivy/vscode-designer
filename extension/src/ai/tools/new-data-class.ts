import path from 'path';
import {
  LanguageModelTextPart,
  LanguageModelToolResult,
  MarkdownString,
  l10n,
  type LanguageModelTool,
  type LanguageModelToolInvocationOptions,
  type LanguageModelToolInvocationPrepareOptions,
  type PreparedToolInvocation,
  type ProviderResult
} from 'vscode';
import { localizeDataClassType } from '../../base/localized-labels';
import type { DataClassBean } from '../../engine/api/generated/client';
import { IvyEngineManager } from '../../engine/engine-manager';

export type NewDataClassToolArgs = {
  name: string;
  namespace: string;
  projectPath: string;
  type?: DataClassType;
};
type DataClassType = 'Data Class' | 'Entity Class';

export class NewDataClassTool implements LanguageModelTool<NewDataClassToolArgs> {
  async invoke(options: LanguageModelToolInvocationOptions<NewDataClassToolArgs>): Promise<LanguageModelToolResult> {
    const message = await createNewDataClass(options.input);
    return Promise.resolve(new LanguageModelToolResult([new LanguageModelTextPart(message)]));
  }

  prepareInvocation?(options: LanguageModelToolInvocationPrepareOptions<NewDataClassToolArgs>): ProviderResult<PreparedToolInvocation> {
    const type = resolvedType(options.input.type);
    const confirmationMessage = [
      l10n.t('Create an Axon Ivy {0} with the following details?', localizeDataClassType(type)),
      `- ${l10n.t('Name')}: ${options.input.name}`,
      `- ${l10n.t('Namespace')}: ${options.input.namespace}`,
      `- ${l10n.t('Project')}: ${path.basename(options.input.projectPath)}`
    ].join('\n');
    return {
      invocationMessage: l10n.t('Creating new Axon Ivy {0} "{1}"', localizeDataClassType(type), options.input.name),
      confirmationMessages: {
        title: l10n.t('New Axon Ivy {0}', localizeDataClassType(type)),
        message: new MarkdownString(confirmationMessage)
      }
    };
  }
}

export const createNewDataClass = async (input: NewDataClassToolArgs): Promise<string> => {
  const type = resolvedType(input.type);
  const newDataClassParams = {
    name: `${input.namespace}.${input.name}`,
    projectDir: input.projectPath
  };

  let dataClassBean: DataClassBean | undefined;
  if (type === 'Data Class') {
    dataClassBean = await IvyEngineManager.instance.createDataClass(newDataClassParams);
  } else {
    dataClassBean = await IvyEngineManager.instance.createEntityClass(newDataClassParams);
  }

  const dataClassPath = dataClassBean ? path.join(newDataClassParams.projectDir, dataClassBean.path) : '<unknown location>';
  return l10n.t("{0} created successfully at '{1}'", localizeDataClassType(type), dataClassPath);
};

const resolvedType = (type?: DataClassType) => type ?? 'Data Class';
