import { commands, ExtensionContext } from 'vscode';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeCommand(command: Command, ...rest: any[]) {
  return commands.executeCommand(command, ...rest);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function registerCommand(command: Command, context: ExtensionContext, callback: (...args: any[]) => any) {
  context.subscriptions.push(commands.registerCommand(command, callback));
}
export type Command =
  | VSCodeCommand
  | EngineCommand
  | ProjectViewCommand
  | ViewCommand
  | JavaCommand
  | ConfigEditorCommand
  | EditorCommand
  | 'ivy.addDevContainer'
  | 'ivy.showStatusBarQuickPick';
type VSCodeCommand = 'setContext' | 'vscode.open' | 'copyFilePath';
type EngineCommand =
  | 'engine.deployProjects'
  | 'engine.buildProjects'
  | 'engine.buildAndDeployProjects'
  | 'engine.switchEngineReleaseTrain'
  | 'engine.deactivateAnimation'
  | 'engine.activateAnimation'
  | 'engine.restart';
type ProjectViewCommand =
  | 'ivyProjects.refreshEntry'
  | 'ivyProjects.buildProject'
  | 'ivyProjects.deployProject'
  | 'ivyProjects.buildAndDeployProject'
  | 'ivyProjects.addBusinessProcess'
  | 'ivyProjects.addCallableSubProcess'
  | 'ivyProjects.addWebServiceProcess'
  | 'ivyProjects.importBpmnProcess'
  | 'ivyProjects.installLocalMarketProduct'
  | 'ivyProjects.installMarketProduct'
  | 'ivyProjects.addNewProject'
  | 'ivyProjects.addNewHtmlDialog'
  | 'ivyProjects.addNewFormDialog'
  | 'ivyProjects.addNewOfflineDialog'
  | 'ivyProjects.addNewDataClass'
  | 'ivyProjects.addNewCaseMap'
  | 'ivyProjects.stopBpmEngine'
  | 'ivyProjects.convertProject';
type ViewCommand =
  | 'ivyBrowserView.focus'
  | 'ivyBrowserView.open'
  | 'ivyBrowserView.openDevWfUi'
  | 'ivyBrowserView.openEngineCockpit'
  | 'ivyBrowserView.openNEO'
  | 'ivyPanelView.openRuntimeLog'
  | 'ivyPanelView.openWelcomePage';
export type ConfigEditorCommand =
  | 'ivyEditor.openVariableEditor'
  | 'ivyEditor.openRoleEditor'
  | 'ivyEditor.openUserEditor'
  | 'ivyEditor.openPersistenceEditor'
  | 'ivyEditor.openDatabaseEditor'
  | 'ivyEditor.openWebServiceClientEditor'
  | 'ivyEditor.openRestClientEditor'
  | 'ivyEditor.openCustomFieldEditor';
export type EditorCommand = 'ivyEditor.openCmsEditor';
type JavaCommand = 'java.project.import.command' | 'java.clean.workspace';
