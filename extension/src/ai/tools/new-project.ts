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
import { IvyEngineManager } from '../../engine/engine-manager';

type NewProjectToolArgs = {
  name: string;
  path: string;
  groupId: string;
  projectId?: string;
};

export const createNewProject = async (input: NewProjectToolArgs): Promise<string> => {
  const newProjectParams = {
    ...input,
    projectId: input.projectId ?? input.name,
    path: path.join(input.path, input.name)
  };
  await IvyEngineManager.instance.createProject(newProjectParams);
  return l10n.t("Project created successfully at '{0}'", newProjectParams.path);
};

export class NewProjectTool implements LanguageModelTool<NewProjectToolArgs> {
  async invoke(options: LanguageModelToolInvocationOptions<NewProjectToolArgs>): Promise<LanguageModelToolResult> {
    const message = await createNewProject(options.input);
    return Promise.resolve(new LanguageModelToolResult([new LanguageModelTextPart(message)]));
  }

  prepareInvocation?(options: LanguageModelToolInvocationPrepareOptions<NewProjectToolArgs>): ProviderResult<PreparedToolInvocation> {
    const confirmationMessage = [
      l10n.t('Create an Axon Ivy project with the following details?'),
      `- ${l10n.t('Name')}: ${options.input.name}`,
      `- ${l10n.t('Group ID')}: ${options.input.groupId}`,
      `- ${l10n.t('Project ID')}: ${options.input.projectId ?? options.input.name}`,
      `- ${l10n.t('Path')}: ${options.input.path}`
    ].join('\n');
    return {
      invocationMessage: l10n.t('Creating new Axon Ivy project "{0}"', options.input.name),
      confirmationMessages: {
        title: l10n.t('New Axon Ivy Project'),
        message: new MarkdownString(confirmationMessage)
      }
    };
  }
}
