import { lm, type ExtensionContext, type LanguageModelTool } from 'vscode';
import { NewProjectTool } from './new-project';

export function registerTools(context: ExtensionContext) {
  registerTool('new_axon_ivy_project', context, new NewProjectTool());
}

function registerTool<T>(tool: Tool, context: ExtensionContext, implementation: LanguageModelTool<T>) {
  context.subscriptions.push(lm.registerTool(tool, implementation));
}

type Tool = 'new_axon_ivy_project';
