import { lm, type ExtensionContext, type LanguageModelTool } from 'vscode';
import { NewDataClassTool } from './new-data-class';
import { NewDialogTool } from './new-dialog';
import { NewProcessTool } from './new-process';
import { NewProjectTool } from './new-project';
import { isOwnToolName, OWN_TOOL_NAMES, type OwnToolName } from './tool-ids';

export function registerTools(context: ExtensionContext) {
  OWN_TOOL_NAMES.forEach(tool => {
    if (tool === 'new_axon_ivy_project') {
      registerTool(tool, context, new NewProjectTool());
    }
    if (tool === 'new_axon_ivy_data_class') {
      registerTool(tool, context, new NewDataClassTool());
    }
    if (tool === 'new_axon_ivy_process') {
      registerTool(tool, context, new NewProcessTool());
    }
    if (tool === 'new_axon_ivy_dialog') {
      registerTool(tool, context, new NewDialogTool());
    }
  });
}

function registerTool<T>(tool: Tool, context: ExtensionContext, implementation: LanguageModelTool<T>) {
  context.subscriptions.push(lm.registerTool(tool, implementation));
}

type Tool = OwnToolName;

export { isOwnToolName, OWN_TOOL_NAMES };
