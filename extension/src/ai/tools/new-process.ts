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
    const message = await createNewProcess(options.input);
    return Promise.resolve(new LanguageModelToolResult([new LanguageModelTextPart(message)]));
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

export const createNewProcess = async (input: NewProcessToolArgs): Promise<string> => {
  const type = resolvedType(input.type);
  const newProcessParams = {
    name: input.name,
    namespace: input.namespace,
    path: input.projectPath,
    kind: type
  };
  const processBean = await IvyEngineManager.instance.createProcess(newProcessParams);
  const processPath = processBean?.uri ? Uri.parse(processBean.uri).fsPath : '<unknown location>';
  return `${type} created successfully at '${processPath}'`;
};

const resolvedType = (type?: ProcessType) => type ?? 'Business Process';
