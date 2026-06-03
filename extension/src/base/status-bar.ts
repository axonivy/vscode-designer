import { MarkdownString, QuickPickItemKind, StatusBarAlignment, ThemeColor, window, type StatusBarItem } from 'vscode';
import { IvyEngineManager } from '../engine/engine-manager';
import { getWebIdeWebSocketReadyState, onWebIdeWebSocketStateChange } from '../engine/web-ide-ws/web-ide-websocket-provider';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { executeCommand } from './commands';
import { animationSettings, onAnimationSettingsChange } from './configurations';

export const newMarkdownString = (text: string) => {
  const markdown = new MarkdownString(text, true);
  markdown.supportThemeIcons = true;
  return markdown;
};

const DEFAULT_TEXT = 'Ready';
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
let subscribedToWebIdeWebsocket = false;
let subscribedToAnimationSettings = false;
let hoverRefreshVersion = 0;

const refreshDefaultHoverMarkdown = () => {
  if (!statusBarItem) {
    return;
  }
  const refreshVersion = ++hoverRefreshVersion;
  void buildDefaultHoverMarkdown(statusBarItem, refreshVersion);
};

const buildDefaultHoverMarkdown = async (item: StatusBarItem, refreshVersion = ++hoverRefreshVersion) => {
  const markdown = newMarkdownString('### Axon Ivy is Ready');
  markdown.appendMarkdown('\n\n' + buildEngineStatusString());
  markdown.appendMarkdown('\n\n' + buildAnimationStatusString());
  markdown.appendMarkdown('\n\n' + (await buildProjectCountString()));
  if (refreshVersion === hoverRefreshVersion) {
    item.tooltip = markdown;
  }
};

const buildProjectCountString = async () => {
  let projectsString = 'Projects in the workspace: ';
  let ivyProjectExplorerInstance: IvyProjectExplorer;
  try {
    ivyProjectExplorerInstance = IvyProjectExplorer.instance;
  } catch {
    projectsString += 'Loading projects...';
    return projectsString;
  }

  try {
    const projectPaths = await ivyProjectExplorerInstance.getIvyProjects();
    projectsString += `${projectPaths.length}`;
  } catch {
    projectsString += 'Error loading projects';
  }

  return projectsString;
};

const buildEngineStatusString = () => {
  let engineStatusString = '**Axon Ivy Engine Status**';

  const engineWebIdeSocketReadyState = getWebIdeWebSocketReadyState();
  const engineConnectionState = (function () {
    switch (engineWebIdeSocketReadyState) {
      case WebSocket.CONNECTING:
        return 'Connecting';
      case WebSocket.OPEN:
        return 'Connected';
      case WebSocket.CLOSING:
        return 'Closing';
      case WebSocket.CLOSED:
        return 'Closed';
    }
  })();

  const ivyEngineMangerInstance = IvyEngineManager.instance;
  const engineUrl = ivyEngineMangerInstance.engineUrl;
  const engineUrlLink = engineUrl ? `[${engineUrl}](${engineUrl})` : 'Engine URL cannot be resolved';

  engineStatusString += `\n\n- Status: ${engineConnectionState}`;
  engineStatusString += `\n\n- URL: ${engineUrlLink}`;

  return engineStatusString;
};

const buildAnimationStatusString = () => {
  let animationStatusString = 'Animation is ';
  animationStatusString += animationSettings().animate ? 'ON' : 'OFF';
  animationStatusString += ` (Speed: ${animationSettings().speed})`;
  return animationStatusString;
};

const getStatusBarItem = () => {
  if (!statusBarItem) {
    statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, DEFAULT_PRIORITY);
    statusBarItem.command = 'ivy.showStatusBarQuickPick';
    refreshDefaultHoverMarkdown();
    if (!subscribedToWebIdeWebsocket) {
      subscribedToWebIdeWebsocket = true;
      onWebIdeWebSocketStateChange(refreshDefaultHoverMarkdown);
    }
    if (!subscribedToAnimationSettings) {
      subscribedToAnimationSettings = true;
      onAnimationSettingsChange(refreshDefaultHoverMarkdown);
    }
  }
  return statusBarItem;
};

const resetToDefault = () => {
  const item = getStatusBarItem();
  item.text = `${DEFAULT_ICON} ${DEFAULT_PREFIX}: ${DEFAULT_TEXT}`;
  refreshDefaultHoverMarkdown();
  item.backgroundColor = undefined;
  item.command = 'ivy.showStatusBarQuickPick';
  item.show();
};

export const setStatusBarItem = (opt: StatusBarItemOptions) => {
  const item = getStatusBarItem();
  const isError = opt.isError ?? false;
  const isClickable = opt.isClickable ?? true;
  item.text = `${opt.icon ?? DEFAULT_ICON} ${opt.prefix ?? DEFAULT_PREFIX}: ${opt.text ?? DEFAULT_TEXT}`;
  item.backgroundColor = isError ? new ThemeColor('statusBarItem.errorBackground') : undefined;
  item.command = isClickable
    ? { title: 'Show Axon Ivy actions', command: 'ivy.showStatusBarQuickPick', arguments: [opt.visibleOptions] }
    : undefined;
  if (opt.hoverMarkdown) {
    item.tooltip = opt.hoverMarkdown;
  } else {
    refreshDefaultHoverMarkdown();
  }
  item.show();
};

export const showStatusBarQuickPick = (visibleOptions?: string[]) => {
  const animationIsOn = animationSettings().animate;
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
