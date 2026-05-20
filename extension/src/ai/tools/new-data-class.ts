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
  type?: DataClassType;
};
type DataClassType = 'Data Class' | 'Entity Class';

export class NewDataClassTool implements LanguageModelTool<NewDataClassToolArgs> {
  async invoke(options: LanguageModelToolInvocationOptions<NewDataClassToolArgs>): Promise<LanguageModelToolResult> {
    const type = resolvedType(options.input.type);
    const newDataClassParams = {
      name: `${options.input.namespace}.${options.input.name}`,
      projectDir: options.input.projectPath
    };
    if (type === 'Data Class') {
      await IvyEngineManager.instance.createDataClass(newDataClassParams);
    } else {
      await IvyEngineManager.instance.createEntityClass(newDataClassParams);
    }
    return Promise.resolve(new LanguageModelToolResult([new LanguageModelTextPart(`${type} created successfully`)]));
  }

  prepareInvocation?(options: LanguageModelToolInvocationPrepareOptions<NewDataClassToolArgs>): ProviderResult<PreparedToolInvocation> {
    const type = resolvedType(options.input.type);
    return {
      invocationMessage: `Creating new Axon Ivy ${type} "${options.input.name}"`,
      confirmationMessages: {
        title: `New Axon Ivy ${type}`,
        message: new MarkdownString(
          `Create an Axon Ivy ${type} with the following details?\n- Name: ${options.input.name}\n- Namespace: ${options.input.namespace}\n- Project: ${path.dirname(options.input.projectPath)}`
        )
      }
    };
  }
}

const resolvedType = (type?: DataClassType) => type ?? 'Data Class';
