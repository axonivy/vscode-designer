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

export type NewProjectToolArgs = {
  name: string;
  path: string;
  groupId: string;
  projectId: string;
};

export class NewProjectTool implements LanguageModelTool<NewProjectToolArgs> {
  async invoke(options: LanguageModelToolInvocationOptions<NewProjectToolArgs>): Promise<LanguageModelToolResult> {
    const newProjectParams = { ...options.input, path: path.join(options.input.path, options.input.name) };
    await IvyEngineManager.instance.createProject(newProjectParams);
    return Promise.resolve(new LanguageModelToolResult([new LanguageModelTextPart('Project created successfully')]));
  }

  prepareInvocation?(options: LanguageModelToolInvocationPrepareOptions<NewProjectToolArgs>): ProviderResult<PreparedToolInvocation> {
    return {
      invocationMessage: 'Creating new Axon Ivy project',
      confirmationMessages: {
        title: 'New Axon Ivy Project',
        message: new MarkdownString(
          `Create an Axon Ivy project with the following details?\n- Name: ${options.input.name}\n- Group ID: ${options.input.groupId}\n- Project ID: ${options.input.projectId}\n- Path: ${options.input.path}`
        )
      }
    };
  }
}
