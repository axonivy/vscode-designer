import { extensions, MarkdownString, QuickPickItemKind, StatusBarAlignment, ThemeColor, window, type StatusBarItem } from 'vscode';
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
  markdown.appendMarkdown(`\n\n Engine Version ${await buildEngineVersionString()}`);
  markdown.appendMarkdown(`\n\n Extension Version ${extensions.getExtension('axonivy.vscode-designer-14')?.packageJSON.version}`);
  markdown.appendMarkdown(
    (await IvyEngineManager.instance.resolveEngineDir()) ??
      '\n\n Engine directory cannot be resolved when "Run Engine by Extension" is disabled.'
  );
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

  const engineUrl = IvyEngineManager.instance.engineUrl;
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

const buildEngineVersionString = async () => {
  return await IvyEngineManager.instance.getEngineVersion();
};

const getStatusBarItem = () => {
  if (!statusBarItem) {
    statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, DEFAULT_PRIORITY);
    statusBarItem.command = 'ivy.showStatusBarQuickPick';
    refreshDefaultHoverMarkdown();
    onWebIdeWebSocketStateChange(refreshDefaultHoverMarkdown);
    onAnimationSettingsChange(refreshDefaultHoverMarkdown);
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
    { label: 'Animation', kind: QuickPickItemKind.Separator },
    { label: animationIsOn ? 'Deactivate Animation' : 'Activate Animation', id: 'toggleAnimation' },

    { label: 'Settings', kind: QuickPickItemKind.Separator },
    { label: '$(settings-gear) Open Axon Ivy Settings', id: 'openSettings' },

    { label: 'Logs', kind: QuickPickItemKind.Separator },
    // TODO: Implement
    // { label: '$(list-filter) Open Axon Ivy Extension Log' },
    // { label: '$(list-filter) Open Axon Ivy Engine Log' },
    { label: '$(list-filter) Open Axon Ivy Runtime Log', id: 'openRuntimeLog' },

    { label: 'Deployment', kind: QuickPickItemKind.Separator },
    { label: '$(layers) Deploy all Axon Ivy Projects', id: 'deployAllProjects' },
    { label: '$(layers-dot) Deploy Axon Ivy Project', id: 'deployProject' },

    { label: 'Market', kind: QuickPickItemKind.Separator },
    { label: '$(gift) Install Market Product', id: 'installMarketProduct' },
    { label: '$(gift) Install Local Market Product', id: 'installLocalMarketProduct' },

    { label: 'New ...', kind: QuickPickItemKind.Separator },
    { label: 'New Project', id: 'newProject' },
    { label: 'New Business Process', id: 'newBusinessProcess' },
    { label: 'New Callable Sub Process', id: 'newCallableSubProcess' },
    { label: 'New Web Service Process', id: 'newWebServiceProcess' },
    { label: 'New Html Dialog (JSF)', id: 'newHtmlDialog' },
    { label: 'New Dialog Form', id: 'newDialogForm' },
    { label: 'New Offline Dialog (JSF)', id: 'newOfflineDialog' },
    { label: 'New Data Class', id: 'newDataClass' },
    { label: 'New Entity Class', id: 'newEntityClass' },
    { label: 'New Case Map', id: 'newCaseMap' }
  ];

  const shownQuickPickOptions =
    !visibleOptions || visibleOptions.length === 0
      ? quickPickOptions
      : quickPickOptions.filter(option => visibleOptions.includes(option.label));

  window.showQuickPick(shownQuickPickOptions, { ignoreFocusOut: true, canPickMany: false }).then(selection => {
    if (!selection) {
      return;
    }
    switch (selection.id) {
      case 'toggleAnimation':
        executeCommand(selection.label.includes('Deactivate') ? 'engine.deactivateAnimation' : 'engine.activateAnimation');
        break;
      case 'openSettings':
        executeCommand('workbench.action.openSettings', '@ext:axonivy.vscode-designer-14');
        break;
      case 'openRuntimeLog':
        executeCommand('ivyPanelView.openRuntimeLog');
        break;
      case 'deployAllProjects':
        executeCommand('engine.deployProjects');
        break;
      case 'deployProject':
        executeCommand('ivyProjects.deployProject');
        break;
      case 'installMarketProduct':
        executeCommand('ivyProjects.installMarketProduct');
        break;
      case 'installLocalMarketProduct':
        executeCommand('ivyProjects.installLocalMarketProduct');
        break;
      case 'newProject':
        executeCommand('ivyProjects.addNewProject');
        break;
      case 'newBusinessProcess':
        executeCommand('ivyProjects.addBusinessProcess');
        break;
      case 'newCallableSubProcess':
        executeCommand('ivyProjects.addCallableSubProcess');
        break;
      case 'newWebServiceProcess':
        executeCommand('ivyProjects.addWebServiceProcess');
        break;
      case 'newHtmlDialog':
        executeCommand('ivyProjects.addNewHtmlDialog');
        break;
      case 'newDialogForm':
        executeCommand('ivyProjects.addNewFormDialog');
        break;
      case 'newOfflineDialog':
        executeCommand('ivyProjects.addNewOfflineDialog');
        break;
      case 'newDataClass':
        executeCommand('ivyProjects.addNewDataClass');
        break;
      case 'newEntityClass':
        executeCommand('ivyProjects.addNewEntityClass');
        break;
      case 'newCaseMap':
        executeCommand('ivyProjects.addNewCaseMap');
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
