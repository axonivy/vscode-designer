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

export type NewDataClassToolArgs = {
  name: string;
  namespace: string;
  projectPath: string;
  type: 'Data Class' | 'Entity Class';
};

export class NewDataClassTool implements LanguageModelTool<NewDataClassToolArgs> {
  async invoke(options: LanguageModelToolInvocationOptions<NewDataClassToolArgs>): Promise<LanguageModelToolResult> {
    const newDataClassParams = {
      name: `${options.input.namespace}.${options.input.name}`,
      projectDir: options.input.projectPath
    };
    if (options.input.type === 'Data Class') {
      await IvyEngineManager.instance.createDataClass(newDataClassParams);
    } else {
      await IvyEngineManager.instance.createEntityClass(newDataClassParams);
    }
    return Promise.resolve(new LanguageModelToolResult([new LanguageModelTextPart(`${options.input.type} created successfully`)]));
  }

  prepareInvocation?(options: LanguageModelToolInvocationPrepareOptions<NewDataClassToolArgs>): ProviderResult<PreparedToolInvocation> {
    return {
      invocationMessage: `Creating new Axon Ivy ${options.input.type} "${options.input.name}"`,
      confirmationMessages: {
        title: `New Axon Ivy ${options.input.type}`,
        message: new MarkdownString(
          `Create an Axon Ivy ${options.input.type} with the following details?\n- Name: ${options.input.name}\n- Namespace: ${options.input.namespace}\n- Project: ${path.dirname(options.input.projectPath)}`
        )
      }
    };
  }
}
