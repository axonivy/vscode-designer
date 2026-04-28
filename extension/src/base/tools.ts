import { lm, type ExtensionContext, type LanguageModelTool } from 'vscode';

export function registerTool<T>(tool: Tool, context: ExtensionContext, implementation: LanguageModelTool<T>) {
  context.subscriptions.push(lm.registerTool(tool, implementation));
}
export type Tool = 'new_axon_ivy_project';
