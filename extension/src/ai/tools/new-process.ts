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
import { IvyEngineManager } from '../../engine/engine-manager';

type NewProcessToolArgs = {
  name: string;
  namespace: string;
  projectPath: string;
  type?: ProcessType;
};
type ProcessType = 'Business Process' | 'Callable Sub Process' | 'Web Service Process';

export class NewProcessTool implements LanguageModelTool<NewProcessToolArgs> {
  async invoke(options: LanguageModelToolInvocationOptions<NewProcessToolArgs>): Promise<LanguageModelToolResult> {
    const type = resolvedType(options.input.type);
    const newProcessParams = {
      name: options.input.name,
      namespace: options.input.namespace,
      path: options.input.projectPath,
      kind: type
    };
    const processBean = await IvyEngineManager.instance.createProcess(newProcessParams);
    const processPath = processBean?.uri ? Uri.parse(processBean.uri).fsPath : '<unknown location>';
    return Promise.resolve(new LanguageModelToolResult([new LanguageModelTextPart(`${type} created successfully at '${processPath}'`)]));
  }

  prepareInvocation?(options: LanguageModelToolInvocationPrepareOptions<NewProcessToolArgs>): ProviderResult<PreparedToolInvocation> {
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

const resolvedType = (type?: ProcessType) => type ?? 'Business Process';
