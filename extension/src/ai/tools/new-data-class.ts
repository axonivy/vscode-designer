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
    const type = resolvedType(options.input.type);
    const newDataClassParams = {
      name: `${options.input.namespace}.${options.input.name}`,
      projectDir: options.input.projectPath
    };
    let dataClassBean: DataClassBean | undefined;
    if (type === 'Data Class') {
      dataClassBean = await IvyEngineManager.instance.createDataClass(newDataClassParams);
    } else {
      dataClassBean = await IvyEngineManager.instance.createEntityClass(newDataClassParams);
    }
    const dataClassPath = dataClassBean ? path.join(newDataClassParams.projectDir, dataClassBean.path) : '<unknown location>';
    return Promise.resolve(new LanguageModelToolResult([new LanguageModelTextPart(`${type} created successfully at '${dataClassPath}'`)]));
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

const resolvedType = (type?: DataClassType) => type ?? 'Data Class';
