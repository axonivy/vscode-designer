import { lm, type ExtensionContext, type LanguageModelTool } from 'vscode';
import { NewDataClassTool } from './new-data-class';
import { NewDialogTool } from './new-dialog';
import { NewProcessTool } from './new-process';
import { NewProjectTool } from './new-project';

export function registerTools(context: ExtensionContext) {
  registerTool('new_axon_ivy_project', context, new NewProjectTool());
  registerTool('new_axon_ivy_data_class', context, new NewDataClassTool());
  registerTool('new_axon_ivy_process', context, new NewProcessTool());
  registerTool('new_axon_ivy_dialog', context, new NewDialogTool());
}

function registerTool<T>(tool: Tool, context: ExtensionContext, implementation: LanguageModelTool<T>) {
  context.subscriptions.push(lm.registerTool(tool, implementation));
}

type Tool = 'new_axon_ivy_project' | 'new_axon_ivy_data_class' | 'new_axon_ivy_process' | 'new_axon_ivy_dialog';
