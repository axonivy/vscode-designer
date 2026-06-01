import path from 'path';
import { MarkdownString, QuickPickItemKind, StatusBarAlignment, ThemeColor, window, workspace, type StatusBarItem } from 'vscode';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { executeCommand } from './commands';

export const newMarkdownString = (text: string) => {
  const markdown = new MarkdownString(text, true);
  markdown.supportThemeIcons = true;
  return markdown;
};

const DEFAULT_TEXT = 'Ready';
const DEFAULT_HOVER = '### Axon Ivy is Ready';
const DEFAULT_ICON: StatusBarIcon = '$(ivy-logo)';
const DEFAULT_PREFIX = 'Axon Ivy';
const DEFAULT_PRIORITY = 1;
const DEFAULT_SUCCESS_MESSAGE_DURATION = 3_000;

type StatusBarIcon = '$(ivy-logo)' | '$(loading~spin)' | '$(error)' | '$(check)';

interface StatusBarItemOptions {
  text?: string;
  hoverMarkdown?: MarkdownString;
  icon?: StatusBarIcon;
  prefix?: string;
  isError?: boolean;
  isClickable?: boolean;
  visibleOptions?: string[];
}

interface StatusBarProgressOptions {
  textDuring: string;
  hoverMarkdownDuring?: MarkdownString;
  textSuccess: string;
  hoverMarkdownSuccess?: MarkdownString;
  textError: string;
  prefix?: string;
  successMsgDuration?: number;
}

let statusBarItem: StatusBarItem | undefined;
let temporaryTimeout: ReturnType<typeof setTimeout> | undefined;

const buildDefaultHoverMarkdown = (projectsString = '') => {
  const markdown = newMarkdownString(DEFAULT_HOVER);
  markdown.appendMarkdown(projectsString);
  return markdown;
};

const buildListOfProjects = (projectPaths: string[] | undefined) => {
  if (!projectPaths || projectPaths.length === 0) {
    return '\nNo projects found in the workspace.';
  }
  return '\n- ' + projectPaths.map(p => p.substring(p.lastIndexOf(path.sep) + 1)).join('\n- ');
};

const addDefaultProjectsHoverMarkdown = (item: StatusBarItem) => {
  const projectsString = '\n**Projects in the workspace:**';
  let ivyProjectExplorerInstance: IvyProjectExplorer;
  try {
    ivyProjectExplorerInstance = IvyProjectExplorer.instance;
  } catch {
    item.tooltip = buildDefaultHoverMarkdown(`${projectsString} + \nWaiting for extension to load projects.`);
    return;
  }

  void ivyProjectExplorerInstance
    .getIvyProjects()
    .then(projectPath => {
      item.tooltip = buildDefaultHoverMarkdown(`${projectsString} ${buildListOfProjects(projectPath)}`);
    })
    .catch(() => {
      item.tooltip = buildDefaultHoverMarkdown(`${projectsString} + \nFailed to load projects.`);
    });
};

const getStatusBarItem = () => {
  if (!statusBarItem) {
    statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, DEFAULT_PRIORITY);
    statusBarItem.command = 'ivy.showStatusBarQuickPick';
    statusBarItem.tooltip = buildDefaultHoverMarkdown();
    addDefaultProjectsHoverMarkdown(statusBarItem);
  }
  return statusBarItem;
};

const resetToDefault = () => {
  const item = getStatusBarItem();
  item.text = `${DEFAULT_ICON} ${DEFAULT_PREFIX}: ${DEFAULT_TEXT}`;
  item.tooltip = buildDefaultHoverMarkdown();
  addDefaultProjectsHoverMarkdown(item);
  item.backgroundColor = undefined;
  item.command = 'ivy.showStatusBarQuickPick';
  item.show();
};

export const setStatusBarItem = (opt: StatusBarItemOptions) => {
  const item = getStatusBarItem();
  const isError = opt.isError ?? false;
  const isClickable = opt.isClickable ?? true;
  item.text = `${opt.icon ?? DEFAULT_ICON} ${opt.prefix ?? DEFAULT_PREFIX}: ${opt.text ?? DEFAULT_TEXT}`;
  item.tooltip = opt.hoverMarkdown ?? buildDefaultHoverMarkdown();
  item.backgroundColor = isError ? new ThemeColor('statusBarItem.errorBackground') : undefined;
  item.command = isClickable
    ? { title: 'Show Axon Ivy actions', command: 'ivy.showStatusBarQuickPick', arguments: [opt.visibleOptions] }
    : undefined;
  item.show();
};

export const showStatusBarQuickPick = (visibleOptions?: string[]) => {
  const animationIsOn = workspace.getConfiguration('axonivy.process.animation').get<boolean>('animate');
  const quickPickOptions = [
    { label: '↻ Reload Window' },
    { label: '🔧 Open Axon Ivy Settings' },
    { label: '🔧 Open Axon Ivy Runtime Log' },
    { label: '🚀 Deploy all Axon Ivy Projects' },
    { label: '🚀 Deploy Axon Ivy Project' },
    { label: 'New ...', kind: QuickPickItemKind.Separator },
    { label: 'New Business Process' },
    { label: 'New Callable Sub Process' },
    { label: 'New Web Service Process' },
    { label: 'New Html Dialog (JSF)' },
    { label: 'New Dialog Form' },
    { label: 'New Offline Dialog (JSF)' },
    { label: 'New Data Class' },
    { label: 'New Entity Class' },
    { label: 'New Case Map' },
    { label: 'New Project' },
    { label: 'Market Products', kind: QuickPickItemKind.Separator },
    { label: 'Install Market Product' },
    { label: 'Install Local Market Product' },
    { label: '', kind: QuickPickItemKind.Separator },
    { label: animationIsOn ? 'Deactivate Animation' : 'Activate Animation' }
  ];

  const shownQuickPickOptions =
    !visibleOptions || visibleOptions.length === 0
      ? quickPickOptions
      : quickPickOptions.filter(option => visibleOptions.includes(option.label));

  window.showQuickPick(shownQuickPickOptions, { ignoreFocusOut: true, canPickMany: false }).then(selection => {
    if (!selection) {
      return;
    }
    switch (selection.label) {
      case '↻ Reload Window':
        executeCommand('workbench.action.reloadWindow');
        break;
      case '🔧 Open Axon Ivy Settings':
        executeCommand('workbench.action.openSettings', '@ext:axonivy.vscode-designer-14');
        break;
      case '🔧 Open Axon Ivy Runtime Log':
        executeCommand('ivyPanelView.openRuntimeLog');
        break;
      case '🚀 Deploy all Axon Ivy Projects':
        executeCommand('engine.deployProjects');
        break;
      case '🚀 Deploy Axon Ivy Project':
        executeCommand('ivyProjects.deployProject');
        break;
      case 'New Business Process':
        executeCommand('ivyProjects.addBusinessProcess');
        break;
      case 'New Callable Sub Process':
        executeCommand('ivyProjects.addCallableSubProcess');
        break;
      case 'New Web Service Process':
        executeCommand('ivyProjects.addWebServiceProcess');
        break;
      case 'New Html Dialog (JSF)':
        executeCommand('ivyProjects.addNewHtmlDialog');
        break;
      case 'New Dialog Form':
        executeCommand('ivyProjects.addNewFormDialog');
        break;
      case 'New Offline Dialog (JSF)':
        executeCommand('ivyProjects.addNewOfflineDialog');
        break;
      case 'New Data Class':
        executeCommand('ivyProjects.addNewDataClass');
        break;
      case 'New Entity Class':
        executeCommand('ivyProjects.addNewEntityClass');
        break;
      case 'New Case Map':
        executeCommand('ivyProjects.addNewCaseMap');
        break;
      case 'New Project':
        executeCommand('ivyProjects.addNewProject');
        break;
      case 'Install Market Product':
        executeCommand('ivyProjects.installMarketProduct');
        break;
      case 'Install Local Market Product':
        executeCommand('ivyProjects.installLocalMarketProduct');
        break;
      case 'Deactivate Animation':
        executeCommand('engine.deactivateAnimation');
        break;
      case 'Activate Animation':
        executeCommand('engine.activateAnimation');
        break;
      default:
        throw Error(`Unknown quick pick selection: ${selection}`);
    }
  });
};

export const withStatusBarProgress = async <R>(options: StatusBarProgressOptions, action: () => Promise<R>): Promise<R> => {
  const { textDuring, textSuccess, textError, prefix, successMsgDuration } = options;

  if (temporaryTimeout) {
    clearTimeout(temporaryTimeout);
    temporaryTimeout = undefined;
  }

  setStatusBarItem({
    text: textDuring,
    icon: '$(loading~spin)',
    prefix: prefix,
    hoverMarkdown: options.hoverMarkdownDuring ?? newMarkdownString(`In Progress: ${textDuring}`),
    isClickable: false
  });

  try {
    const result = await action();
    setStatusBarItem({
      text: textSuccess,
      icon: '$(check)',
      prefix: prefix,
      hoverMarkdown: options.hoverMarkdownSuccess ?? newMarkdownString(`${textSuccess}`)
    });
    temporaryTimeout = setTimeout(() => {
      resetToDefault();
      temporaryTimeout = undefined;
    }, successMsgDuration ?? DEFAULT_SUCCESS_MESSAGE_DURATION);
    return result;
  } catch (error) {
    setStatusBarItem({
      text: textError,
      icon: '$(error)',
      prefix: prefix,
      isError: true,
      hoverMarkdown: newMarkdownString(`${error instanceof Error ? error.message : textError}`)
    });
    throw error;
  }
};
