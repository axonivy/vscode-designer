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
    return {
      invocationMessage: `Creating new Axon Ivy ${type} "${options.input.name}"`,
      confirmationMessages: {
        title: `New Axon Ivy ${type}`,
        message: new MarkdownString(
          `Create an Axon Ivy ${type} with the following details?\n- Name: ${options.input.name}\n- Namespace: ${options.input.namespace}\n- Project: ${path.basename(options.input.projectPath)}`
        )
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
  return `${type} created successfully at '${dataClassPath}'`;
};

const resolvedType = (type?: DataClassType) => type ?? 'Data Class';
