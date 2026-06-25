import path from 'path';
import {
  LanguageModelTextPart,
  type LanguageModelTool,
  type LanguageModelToolInvocationOptions,
  type LanguageModelToolInvocationPrepareOptions,
  LanguageModelToolResult,
  MarkdownString,
  type PreparedToolInvocation,
  type ProviderResult
} from 'vscode';
import { IvyEngineManager } from '../../engine/engine-manager';

type NewProjectToolArgs = {
  name: string;
  path: string;
  groupId: string;
  projectId: string;
};

export const createNewProject = async (input: NewProjectToolArgs): Promise<string> => {
  const newProjectParams = {
    ...input,
    path: path.join(input.path, input.name)
  };
  await IvyEngineManager.instance.createProject(newProjectParams);
  return `Project created successfully at '${newProjectParams.path}'`;
};

export class NewProjectTool implements LanguageModelTool<NewProjectToolArgs> {
  async invoke(options: LanguageModelToolInvocationOptions<NewProjectToolArgs>): Promise<LanguageModelToolResult> {
    const message = await createNewProject(options.input);
    return Promise.resolve(new LanguageModelToolResult([new LanguageModelTextPart(message)]));
  }

  prepareInvocation?(options: LanguageModelToolInvocationPrepareOptions<NewProjectToolArgs>): ProviderResult<PreparedToolInvocation> {
    return {
      invocationMessage: `Creating new Axon Ivy project "${options.input.name}"`,
      confirmationMessages: {
        title: 'New Axon Ivy Project',
        message: new MarkdownString(
          `Create an Axon Ivy project with the following details?\n- Name: ${options.input.name}\n- Group ID: ${options.input.groupId}\n- Project ID: ${options.input.projectId}\n- Path: ${options.input.path}`
        )
      }
    };
  }
}
