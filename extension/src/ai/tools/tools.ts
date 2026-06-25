import { lm, type ExtensionContext, type LanguageModelTool } from 'vscode';
import { NewDataClassTool, createNewDataClass } from './new-data-class';
import { NewDialogTool, createNewDialog } from './new-dialog';
import { NewProcessTool, createNewProcess } from './new-process';
import { NewProjectTool, createNewProject } from './new-project';

type OwnToolInvoker = (args: Record<string, unknown>) => Promise<string>;

type OwnToolDefinition<Name extends string = string> = {
  name: Name;
  createTool: () => LanguageModelTool<unknown>;
  invokeHeadless: OwnToolInvoker;
};

const OWN_TOOL_DEFINITIONS = [
  {
    name: 'new_axon_ivy_project',
    createTool: () => new NewProjectTool(),
    invokeHeadless: async args => createNewProject(args as Awaited<Parameters<typeof createNewProject>[0]>)
  },
  {
    name: 'new_axon_ivy_data_class',
    createTool: () => new NewDataClassTool(),
    invokeHeadless: async args => createNewDataClass(args as Awaited<Parameters<typeof createNewDataClass>[0]>)
  },
  {
    name: 'new_axon_ivy_process',
    createTool: () => new NewProcessTool(),
    invokeHeadless: async args => createNewProcess(args as Awaited<Parameters<typeof createNewProcess>[0]>)
  },
  {
    name: 'new_axon_ivy_dialog',
    createTool: () => new NewDialogTool(),
    invokeHeadless: async args => createNewDialog(args as Awaited<Parameters<typeof createNewDialog>[0]>)
  }
] as const satisfies ReadonlyArray<OwnToolDefinition>;

export type OwnToolName = (typeof OWN_TOOL_DEFINITIONS)[number]['name'];

const OWN_TOOL_BY_NAME: ReadonlyMap<OwnToolName, OwnToolDefinition<OwnToolName>> = new Map(
  OWN_TOOL_DEFINITIONS.map(definition => [definition.name, definition] as const)
);

export function isOwnToolName(name: string): name is OwnToolName {
  return OWN_TOOL_BY_NAME.has(name as OwnToolName);
}

export function createOwnToolImplementation(name: OwnToolName): LanguageModelTool<unknown> {
  const definition = OWN_TOOL_BY_NAME.get(name);
  if (!definition) {
    throw new Error(`No tool implementation registered for '${name}'`);
  }
  return definition.createTool();
}

export function getOwnToolHeadlessInvoker(name: OwnToolName): OwnToolInvoker | undefined {
  return OWN_TOOL_BY_NAME.get(name)?.invokeHeadless;
}

export function registerTools(context: ExtensionContext) {
  OWN_TOOL_DEFINITIONS.forEach(definition => {
    registerTool(definition.name, context, definition.createTool());
  });
}

function registerTool(tool: Tool, context: ExtensionContext, implementation: LanguageModelTool<unknown>) {
  context.subscriptions.push(lm.registerTool(tool, implementation));
}

type Tool = OwnToolName;
