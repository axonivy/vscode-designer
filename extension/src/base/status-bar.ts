import {
  extensions,
  MarkdownString,
  QuickPickItemKind,
  StatusBarAlignment,
  ThemeColor,
  window,
  type Command,
  type ExtensionContext,
  type StatusBarItem
} from 'vscode';
import { IvyEngineManager } from '../engine/engine-manager';
import { showEngineLog } from '../engine/engine-output-channel';
import { onWebIdeWebSocketStateChange, type WebSocketReadyState } from '../engine/web-ide-ws/web-ide-websocket-provider';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { showRuntimeLog } from '../views/runtimelog-view';
import { executeCommand } from './commands';
import { animationSettings, config, onAnimationSettingsChange } from './configurations';
import { showExtensionLog } from './extension-output-channel';
import { logErrorMessageWithActions } from './logging-util';

const DEFAULT_PREFIX = 'Axon Ivy';
const DEFAULT_PRIORITY = 1;
const DEFAULT_SUCCESS_MESSAGE_DURATION = 3_000;
const DEFAULT_TOOLTIP_DIVIDER = '\n\n============================================================';
const DEFAULT_TRUSTED_COMMANDS_MARKDOWN = [
  'ivyPanelView.openRuntimeLog',
  'ivyPanelView.openExtensionLog',
  'ivyPanelView.openEngineLog',
  'engine.activateAnimation',
  'engine.deactivateAnimation',
  'workbench.action.openSettings'
];

type StatusBarIcon = '$(loading~spin)' | '$(error)' | '$(check)' | '$(plug)' | '$(debug-disconnect)' | '';

interface OverrideStatusBar {
  text: string;
  tooltip: MarkdownString;
  icon: StatusBarIcon;
  isError?: boolean;
  isClickable?: boolean;
  visibleOptions?: string[];
}

interface StatusBarProgressOptions {
  text: string;
  tooltip?: string;
  textSuccess?: string;
  textError?: string;
  successMsgDuration?: number;
}

export const newMarkdownString = (text: string, additionalTrustedCommands: string[] = []) => {
  const markdown = new MarkdownString(text, true);
  markdown.supportThemeIcons = true;
  const trustedCommands = DEFAULT_TRUSTED_COMMANDS_MARKDOWN.concat(additionalTrustedCommands);
  if (trustedCommands.length > 0) {
    markdown.isTrusted = {
      enabledCommands: trustedCommands
    };
  }
  return markdown;
};

export class StatusBar {
  private static instance: StatusBar | undefined;

  private statusBarItem: StatusBarItem;
  private temporaryTimeout: ReturnType<typeof setTimeout> | undefined;
  private refreshVersion = 0;
  private listenersSubscribed = false;
  private readyState: WebSocketReadyState = WebSocket.CLOSED;

  private constructor(context: ExtensionContext) {
    this.statusBarItem = window.createStatusBarItem('ivyStatusBarItem', StatusBarAlignment.Left, DEFAULT_PRIORITY);
    this.subscribeToReadyStatus();
    context.subscriptions.push(this.statusBarItem);
  }

  public static init(context: ExtensionContext) {
    if (!StatusBar.instance) {
      StatusBar.instance = new StatusBar(context);
    }
  }
  public static async withStatusBarProgress<R>(options: StatusBarProgressOptions, action: () => Promise<R>): Promise<R | undefined> {
    return await StatusBar.getInstance().withStatusBarProgress(options, action);
  }

  public static overrideStatusBar(opt: OverrideStatusBar) {
    StatusBar.getInstance().overrideStatusBar(opt);
  }

  public static refreshStatusBar() {
    StatusBar.getInstance().refreshStatusBar();
  }

  public static showStatusBarQuickPick(visibleOptions?: string[]) {
    StatusBar.getInstance().showStatusBarQuickPick(visibleOptions);
  }

  private static getInstance() {
    if (!StatusBar.instance) {
      throw new Error('StatusBar not initialized. Please call StatusBar.init(context) before using it.');
    }
    return StatusBar.instance;
  }

  private subscribeToReadyStatus() {
    if (this.listenersSubscribed) {
      return;
    }

    onWebIdeWebSocketStateChange(async (readyState: WebSocketReadyState) => {
      this.readyState = readyState;
      await this.refreshStatusBar();
    });

    onAnimationSettingsChange(async () => {
      await this.refreshTooltip();
    });

    this.listenersSubscribed = true;
  }

  private async refreshStatusBar() {
    if (this.temporaryTimeout) {
      clearTimeout(this.temporaryTimeout);
      this.temporaryTimeout = undefined;
    }

    let statusLabel: string = '';
    let statusIcon: StatusBarIcon = '';
    let statusBackgroundColor: ThemeColor | undefined;
    let command: string | Command = {
      title: 'Show Axon Ivy actions',
      command: 'ivy.showStatusBarQuickPick',
      arguments: [['openRuntimeLog', 'openExtensionLog', 'openEngineLog', 'openSettings']]
    };

    switch (this.readyState) {
      case WebSocket.CONNECTING:
        statusLabel = 'Connecting ...';
        statusIcon = '$(loading~spin)';
        this.statusBarItem.tooltip = newMarkdownString(
          'Connecting to the Axon Ivy Engine...\n\nPlease wait while the connection is being established.'
        );
        break;
      case WebSocket.OPEN:
        statusLabel = 'Connected';
        statusIcon = '$(plug)';
        command = 'ivy.showStatusBarQuickPick';
        await this.refreshTooltip();
        break;
      case WebSocket.CLOSING:
        statusLabel = 'Disconnecting ...';
        statusIcon = '$(debug-disconnect)';
        this.statusBarItem.tooltip = newMarkdownString('Disconnecting from the Axon Ivy Engine...');
        break;
      case WebSocket.CLOSED:
        statusLabel = 'Disconnected';
        statusIcon = '$(debug-disconnect)';
        statusBackgroundColor = new ThemeColor('statusBarItem.errorBackground');
        await this.refreshTooltip();
        break;
      default:
        break;
    }

    const item = this.statusBarItem;
    item.text = `${statusIcon} ${DEFAULT_PREFIX}: ${statusLabel}`;
    item.backgroundColor = statusBackgroundColor;
    item.command = command;
    item.show();
  }

  private async refreshTooltip() {
    if (!this.statusBarItem) {
      return;
    }
    const refreshVersion = ++this.refreshVersion;
    await this.buildTooltip(refreshVersion);
  }

  private async buildTooltip(refreshVersion = ++this.refreshVersion) {
    if (!this.statusBarItem) {
      return;
    }
    let statusLabel: string = '';
    switch (this.readyState) {
      case WebSocket.CONNECTING:
        statusLabel = 'Connecting ...';
        break;
      case WebSocket.OPEN:
        statusLabel = 'Connected';
        break;
      case WebSocket.CLOSING:
        statusLabel = 'Disconnecting ...';
        break;
      case WebSocket.CLOSED:
        statusLabel = 'Disconnected';
        break;
      default:
        break;
    }

    const markdown = newMarkdownString(`### ${DEFAULT_PREFIX} Engine Status - ${statusLabel}`);
    markdown.appendMarkdown('\n\n Animation ' + this.buildAnimationStatusString());
    markdown.appendMarkdown('\n\n Projects in Workspace - ' + (await this.buildProjectCountString()));
    markdown.appendMarkdown('\n\n Engine URL - ' + this.buildEngineUrlString());
    markdown.appendMarkdown('\n\n Engine Dir - ' + (await this.buildEngineDirString()));
    markdown.appendMarkdown('\n\n Engine Version - ' + (await this.buildEngineVersionString()));
    markdown.appendMarkdown(`\n\n Extension Version - ${extensions.getExtension('axonivy.vscode-designer-14')?.packageJSON.version}`);
    if (refreshVersion === this.refreshVersion) {
      this.statusBarItem.tooltip = markdown;
    }
  }

  private async buildProjectCountString() {
    let ivyProjectExplorerInstance: IvyProjectExplorer;
    try {
      ivyProjectExplorerInstance = IvyProjectExplorer.instance;
    } catch {
      return 'Loading projects...';
    }

    try {
      const projects = await ivyProjectExplorerInstance.getIvyProjects();
      return projects.length.toString();
    } catch {
      return 'Error loading projects';
    }
  }

  private buildEngineUrlString() {
    if (this.readyState !== WebSocket.OPEN) {
      return 'No connection to the engine. URL cannot be resolved.';
    }
    const engineUrl = IvyEngineManager.instance.engineUrl;
    const engineUrlLink = engineUrl ? `[${engineUrl}](${engineUrl})` : 'Engine URL cannot be resolved';
    return engineUrlLink;
  }

  private buildAnimationStatusString() {
    const animationToggleCommandLink = animationSettings().animate
      ? '[Turn OFF](command:engine.deactivateAnimation)'
      : '[Turn ON](command:engine.activateAnimation)';
    return `${animationSettings().animate ? `ON (${animationToggleCommandLink})` : `OFF (${animationToggleCommandLink})`} (Speed: ${animationSettings().speed}, Mode: ${animationSettings().mode})`;
  }

  private async buildEngineVersionString() {
    if (this.readyState !== WebSocket.OPEN) {
      return 'Cannot retrieve engine version without a connection.';
    }
    const engineVersion = await IvyEngineManager.instance.getEngineVersion();
    return engineVersion;
  }

  private async buildEngineDirString() {
    if (!config.engineRunByExtension()) {
      return 'Engine directory is only available when "Run by Extension" is enabled.';
    }
    if (this.readyState !== WebSocket.OPEN) {
      return 'Cannot retrieve engine directory without a connection.';
    }
    const engineDir = await IvyEngineManager.instance.resolveEngineDir();
    const engineDirLink = engineDir ? `[${engineDir}](${encodeURI('file://' + engineDir)})` : 'Cannot resolve engine directory';
    return engineDirLink;
  }

  private overrideStatusBar(opt: OverrideStatusBar) {
    const item = this.statusBarItem;
    const isError = opt.isError ?? false;
    const isClickable = opt.isClickable ?? true;

    item.text = `${opt.icon} ${DEFAULT_PREFIX}: ${opt.text}`;
    item.tooltip = opt.tooltip;
    item.backgroundColor = isError ? new ThemeColor('statusBarItem.errorBackground') : undefined;
    item.command = isClickable
      ? { title: 'Show Axon Ivy actions', command: 'ivy.showStatusBarQuickPick', arguments: [opt.visibleOptions] }
      : undefined;
    item.show();
  }

  private showStatusBarQuickPick(visibleOptions?: string[]) {
    const animationIsOn = animationSettings().animate;
    const quickPickOptions = [
      { label: 'Animation', kind: QuickPickItemKind.Separator },
      {
        label: animationIsOn ? '$(eye-closed) Deactivate Animation' : '$(eye) Activate Animation',
        id: 'toggleAnimation',
        callback: () => executeCommand(animationIsOn ? 'engine.deactivateAnimation' : 'engine.activateAnimation')
      },

      { label: 'Settings', kind: QuickPickItemKind.Separator },
      {
        label: '$(settings-gear) Open Axon Ivy Settings',
        id: 'openSettings',
        callback: () => executeCommand('workbench.action.openSettings', '@ext:axonivy.vscode-designer-14')
      },

      { label: 'Logs', kind: QuickPickItemKind.Separator },
      {
        label: '$(list-filter) Open Axon Ivy Runtime Log',
        id: 'openRuntimeLog',
        callback: () => executeCommand('ivyPanelView.openRuntimeLog')
      },
      {
        label: '$(list-filter) Open Axon Ivy Extension Log',
        id: 'openExtensionLog',
        callback: () => executeCommand('ivyPanelView.openExtensionLog')
      },
      {
        label: '$(list-filter) Open Axon Ivy Engine Log',
        id: 'openEngineLog',
        callback: () => executeCommand('ivyPanelView.openEngineLog')
      },

      { label: 'Deployment', kind: QuickPickItemKind.Separator },
      { label: '$(layers) Deploy all Axon Ivy Projects', id: 'deployAllProjects', callback: () => executeCommand('engine.deployProjects') },
      { label: '$(layers-dot) Deploy Axon Ivy Project', id: 'deployProject', callback: () => executeCommand('ivyProjects.deployProject') },

      { label: 'Market', kind: QuickPickItemKind.Separator },
      {
        label: '$(gift) Install Market Product',
        id: 'installMarketProduct',
        callback: () => executeCommand('ivyProjects.installMarketProduct')
      },
      {
        label: '$(gift) Install Local Market Product',
        id: 'installLocalMarketProduct',
        callback: () => executeCommand('ivyProjects.installLocalMarketProduct')
      },

      { label: 'New ...', kind: QuickPickItemKind.Separator },
      { label: '$(repo-create) New Project', id: 'newProject', callback: () => executeCommand('ivyProjects.addNewProject') }
    ];

    const shownQuickPickOptions =
      !visibleOptions || visibleOptions.length === 0
        ? quickPickOptions
        : quickPickOptions.filter(option => visibleOptions.includes(option.id ?? ''));

    window.showQuickPick(shownQuickPickOptions, { ignoreFocusOut: true, canPickMany: false }).then(selection => {
      if (!selection) {
        return;
      }
      if (selection.callback) {
        selection.callback();
        return;
      }
    });
  }

  async withStatusBarProgress<R>(options: StatusBarProgressOptions, action: () => Promise<R>): Promise<R | undefined> {
    const textDuring = options.text;
    const tooltip = newMarkdownString(options.tooltip ?? textDuring);
    const textSuccess = options.textSuccess ?? `Success: ${textDuring}`;
    const textError = options.textError ?? `Error: ${textDuring}`;
    const successMsgDuration = options.successMsgDuration ?? DEFAULT_SUCCESS_MESSAGE_DURATION;

    if (this.temporaryTimeout) {
      clearTimeout(this.temporaryTimeout);
      this.temporaryTimeout = undefined;
    }

    await this.refreshTooltip();
    const currentTooltip = this.statusBarItem.tooltip;
    const previousTooltip = currentTooltip instanceof MarkdownString ? currentTooltip : newMarkdownString('');

    this.overrideStatusBar({
      text: textDuring,
      tooltip: tooltip,
      icon: '$(loading~spin)',
      isClickable: false
    });

    try {
      const result = await action();
      this.overrideStatusBar({
        text: textSuccess,
        tooltip: previousTooltip.appendMarkdown(`${DEFAULT_TOOLTIP_DIVIDER}\n\n**Success last operation: ${textDuring}**`),
        icon: '$(check)'
      });
      this.temporaryTimeout = setTimeout(async () => {
        await this.refreshStatusBar();
        this.temporaryTimeout = undefined;
      }, successMsgDuration);
      return result;
    } catch (error) {
      const errorString = error instanceof Error ? error.message : String(error);
      const linksString = this.buildLogLinks();
      const previousTooltipError = newMarkdownString(previousTooltip.value);
      previousTooltipError.appendMarkdown(`${DEFAULT_TOOLTIP_DIVIDER}\n\n**Error last operation: ${textDuring}**`);
      previousTooltipError.appendText(`\n\n${errorString}\n\n`);
      previousTooltipError.appendMarkdown(`\n\n${linksString}`);
      this.overrideStatusBar({
        text: textError,
        tooltip: previousTooltipError,
        icon: '$(error)',
        isError: true
      });
      logErrorMessageWithActions(`${textError}\n\n${errorString}`, {
        'Open Runtime Log': () => showRuntimeLog(),
        'Open Extension Log': () => showExtensionLog(),
        'Open Engine Log': () => showEngineLog()
      });
    }
  }

  private buildLogLinks() {
    const linkRuntimeLog = '[Open Runtime Log](command:ivyPanelView.openRuntimeLog)';
    const linkExtensionLog = '[Open Extension Log](command:ivyPanelView.openExtensionLog)';
    const linkEngineLog = '[Open Engine Log](command:ivyPanelView.openEngineLog)';
    return `${linkRuntimeLog} | ${linkExtensionLog} | ${linkEngineLog}`;
  }
}
