import {
  extensions,
  l10n,
  MarkdownString,
  QuickPickItemKind,
  StatusBarAlignment,
  ThemeColor,
  Uri,
  window,
  type Command,
  type ExtensionContext,
  type QuickPickItem,
  type StatusBarItem
} from 'vscode';
import { IvyEngineManager } from '../engine/engine-manager';
import { showEngineLog } from '../engine/engine-output-channel';
import { onWebIdeWebSocketStateChange, type WebSocketReadyState } from '../engine/web-ide-ws/web-ide-websocket-provider';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { showRuntimeLog } from '../views/runtimelog-view';
import { executeCommand, type KnownCommand } from './commands';
import { animationSettings, config, onAnimationSettingsChange } from './configurations';
import { showExtensionLog } from './extension-output-channel';
import { logErrorMessageWithActions } from './logging-util';

const DEFAULT_PREFIX = 'Axon Ivy';
const DEFAULT_PRIORITY = 1;
const DEFAULT_SUCCESS_MESSAGE_DURATION = 3_000;
const DEFAULT_TOOLTIP_DIVIDER = '============================================================';
const DEFAULT_TRUSTED_COMMANDS_MARKDOWN = [
  'ivyPanelView.openRuntimeLog',
  'ivyPanelView.openExtensionLog',
  'ivyPanelView.openEngineLog',
  'engine.activateAnimation',
  'engine.deactivateAnimation',
  'ivy.openSettings'
] as const satisfies Array<KnownCommand>;

const ANIMATION_SPEED_LABELS: Record<number, string> = {
  0: l10n.t('Fastest'),
  25: l10n.t('Fast'),
  50: l10n.t('Normal'),
  75: l10n.t('Slow'),
  100: l10n.t('Slowest')
};
const ANIMATION_MODE_LABELS: Record<string, string> = {
  all: l10n.t('Show and open all touched processes'),
  currentProcess: l10n.t('Follow only in the current editor on top'),
  openProcesses: l10n.t('Follow only in open editors'),
  noDialogProcesses: l10n.t('Do not enter dialog logic'),
  noEmbeddedProcesses: l10n.t('Follow only top-level business processes')
};

type StatusQuickPickItem = QuickPickItem & { id?: string; command?: KnownCommand; commandArgs?: unknown[]; hidden?: boolean };

const QUICK_PICK_OPTIONS = [
  { label: `$(refresh)  ${l10n.t('Reload Window')}`, id: 'reloadWindow', command: 'workbench.action.reloadWindow', hidden: true },
  { label: l10n.t('Animation'), kind: QuickPickItemKind.Separator },
  {
    label: animationSettings().animate ? `$(eye-closed)  ${l10n.t('Deactivate Animation')}` : `$(eye)  ${l10n.t('Activate Animation')}`,
    id: 'toggleAnimation',
    command: animationSettings().animate ? 'engine.deactivateAnimation' : 'engine.activateAnimation'
  },

  { label: l10n.t('Settings'), kind: QuickPickItemKind.Separator },
  {
    label: `$(settings-gear)  ${l10n.t('Open Axon Ivy Settings')}`,
    id: 'openSettings',
    command: 'ivy.openSettings'
  },

  { label: l10n.t('Logs'), kind: QuickPickItemKind.Separator },
  {
    label: `$(list-filter)  ${l10n.t('Open Axon Ivy Runtime Log')}`,
    id: 'openRuntimeLog',
    command: 'ivyPanelView.openRuntimeLog'
  },
  {
    label: `$(list-filter)  ${l10n.t('Open Axon Ivy Extension Log')}`,
    id: 'openExtensionLog',
    command: 'ivyPanelView.openExtensionLog'
  },
  {
    label: `$(list-filter)  ${l10n.t('Open Axon Ivy Engine Log')}`,
    id: 'openEngineLog',
    command: 'ivyPanelView.openEngineLog'
  },

  { label: l10n.t('Deployment'), kind: QuickPickItemKind.Separator },
  {
    label: `$(cloud-upload)  ${l10n.t('Deploy all Axon Ivy Projects')}`,
    id: 'deployAllProjects',
    command: 'engine.deployProjects'
  },
  {
    label: `$(cloud-upload)  ${l10n.t('Deploy Axon Ivy Project')}`,
    id: 'deployProject',
    command: 'ivyProjects.deployProject'
  },

  { label: l10n.t('Market'), kind: QuickPickItemKind.Separator },
  {
    label: `$(gift)  ${l10n.t('Install Market Product')}`,
    id: 'installMarketProduct',
    command: 'ivyProjects.installMarketProduct'
  },
  { label: l10n.t('New ...'), kind: QuickPickItemKind.Separator },
  { label: `$(repo-create)  ${l10n.t('New Project')}`, id: 'newProject', command: 'ivyProjects.addNewProject' },
  {
    label: `$(repo-create)  ${l10n.t('Import Axon Ivy Project')}`,
    id: 'importProject',
    command: 'ivyProjects.importIvyProject'
  }
] as const satisfies Array<StatusQuickPickItem>;

export type QuickPickOptionId = Extract<(typeof QUICK_PICK_OPTIONS)[number], { id: string }>['id'];

type StatusBarIcon = '$(loading~spin)' | '$(error)' | '$(check)' | '$(plug)' | '$(debug-disconnect)' | '';

interface OverrideStatusBar {
  text: string;
  tooltip: MarkdownString;
  icon: StatusBarIcon;
  isError?: boolean;
  isClickable?: boolean;
  visibleOptions?: QuickPickOptionId[];
}

interface StatusBarProgressOptions {
  text: string;
  tooltip?: string;
  textSuccess?: string;
  textError?: string;
  successMsgDuration?: number;
}

export const newMarkdownString = (text: string) => {
  const markdown = new MarkdownString(text, true);
  markdown.supportThemeIcons = true;
  markdown.isTrusted = {
    enabledCommands: DEFAULT_TRUSTED_COMMANDS_MARKDOWN
  };
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

  public static showStatusBarQuickPick(visibleOptions?: QuickPickOptionId[]) {
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
    let command: 'ivy.showStatusBarQuickPick' | Command = {
      title: l10n.t('Show Axon Ivy actions'),
      command: 'ivy.showStatusBarQuickPick',
      arguments: [['reloadWindow', 'openRuntimeLog', 'openExtensionLog', 'openEngineLog', 'openSettings']]
    };

    switch (this.readyState) {
      case WebSocket.CONNECTING:
        statusLabel = l10n.t('Connecting ...');
        statusIcon = '$(loading~spin)';
        this.statusBarItem.tooltip = newMarkdownString(
          `${l10n.t('Connecting to the Axon Ivy Engine...')}\n\n${l10n.t('Please wait while the connection is being established.')}`
        );
        break;
      case WebSocket.OPEN:
        statusLabel = l10n.t('Connected');
        statusIcon = '$(plug)';
        command = 'ivy.showStatusBarQuickPick';
        await this.refreshTooltip();
        break;
      case WebSocket.CLOSING:
        statusLabel = l10n.t('Disconnecting ...');
        statusIcon = '$(debug-disconnect)';
        this.statusBarItem.tooltip = newMarkdownString(l10n.t('Disconnecting from the Axon Ivy Engine...'));
        break;
      case WebSocket.CLOSED:
        statusLabel = l10n.t('Disconnected');
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
        statusLabel = l10n.t('Connecting ...');
        break;
      case WebSocket.OPEN:
        statusLabel = l10n.t('Connected');
        break;
      case WebSocket.CLOSING:
        statusLabel = l10n.t('Disconnecting ...');
        break;
      case WebSocket.CLOSED:
        statusLabel = l10n.t('Disconnected');
        break;
      default:
        break;
    }

    const markdown = newMarkdownString(`### ${l10n.t('{0} Engine Status - {1}', DEFAULT_PREFIX, statusLabel)}`);
    markdown.appendMarkdown('\n\n' + this.buildAnimationStatusString());
    markdown.appendMarkdown(`\n\n${l10n.t('Projects in Workspace - {0}', await this.buildProjectCountString())}`);
    markdown.appendMarkdown(`\n\n${l10n.t('Engine URL - {0}', this.buildEngineUrlString())}`);
    markdown.appendMarkdown(`\n\n${l10n.t('Engine Dir - {0}', await this.buildEngineDirString())}`);
    markdown.appendMarkdown(`\n\n${l10n.t('Engine Version - {0}', String(await this.buildEngineVersionString()))}`);
    markdown.appendMarkdown(
      `\n\n${l10n.t('Extension Version - {0}', extensions.getExtension('axonivy.vscode-designer-14')?.packageJSON.version ?? '')}`
    );
    if (refreshVersion === this.refreshVersion) {
      this.statusBarItem.tooltip = markdown;
    }
  }

  private async buildProjectCountString() {
    let ivyProjectExplorerInstance: IvyProjectExplorer;
    try {
      ivyProjectExplorerInstance = IvyProjectExplorer.instance;
    } catch {
      return l10n.t('Loading projects...');
    }

    try {
      const projects = await ivyProjectExplorerInstance.getIvyProjects();
      return projects.length.toString();
    } catch {
      return l10n.t('Error loading projects');
    }
  }

  private buildEngineUrlString() {
    if (this.readyState !== WebSocket.OPEN) {
      return l10n.t('No connection to the engine. URL cannot be resolved.');
    }
    const engineUrl = IvyEngineManager.instance.engineUrl;
    const engineUrlLink = engineUrl ? `[${engineUrl}](${engineUrl})` : l10n.t('Engine URL cannot be resolved');
    return engineUrlLink;
  }

  private buildAnimationStatusString() {
    const settings = animationSettings();
    const animationToggleCommandLink = settings.animate
      ? `[${l10n.t('Turn OFF')}](command:engine.deactivateAnimation)`
      : `[${l10n.t('Turn ON')}](command:engine.activateAnimation)`;
    const speed = ANIMATION_SPEED_LABELS[settings.speed] ?? String(settings.speed);
    const mode = ANIMATION_MODE_LABELS[settings.mode] ?? settings.mode;
    const state = settings.animate ? l10n.t('ON ({0})', animationToggleCommandLink) : l10n.t('OFF ({0})', animationToggleCommandLink);
    return [
      `**${l10n.t('Animation:')}** ${state}`,
      `**${l10n.t('Animation Speed:')}** ${speed}`,
      `**${l10n.t('Animation Mode:')}** ${mode}`
    ].join('  \n');
  }

  private async buildEngineVersionString() {
    if (this.readyState !== WebSocket.OPEN) {
      return l10n.t('Cannot retrieve engine version without a connection.');
    }
    const engineVersion = await IvyEngineManager.instance.getEngineVersion();
    return engineVersion;
  }

  private async buildEngineDirString() {
    if (!config.engineRunByExtension()) {
      return l10n.t('Engine directory is only available when "Run by Extension" is enabled.');
    }
    if (this.readyState !== WebSocket.OPEN) {
      return l10n.t('Cannot retrieve engine directory without a connection.');
    }
    const engineDir = IvyEngineManager.instance.engineDir;
    const engineDirLink = engineDir ? `[${engineDir}](${Uri.file(engineDir).toString()})` : l10n.t('Cannot resolve engine directory');
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
      ? { title: l10n.t('Show Axon Ivy actions'), command: 'ivy.showStatusBarQuickPick', arguments: [opt.visibleOptions] }
      : undefined;
    item.show();
  }

  private showStatusBarQuickPick(visibleOptions?: QuickPickOptionId[]) {
    let shownQuickPickOptions: Array<StatusQuickPickItem> = [...QUICK_PICK_OPTIONS];
    if (visibleOptions && visibleOptions.length > 0) {
      shownQuickPickOptions = shownQuickPickOptions
        .filter(option => option.id && visibleOptions.includes(option.id as QuickPickOptionId))
        .map(option => ({ ...option, hidden: false }));
    }
    shownQuickPickOptions = shownQuickPickOptions.filter(option => !option.hidden);

    window
      .showQuickPick<StatusQuickPickItem>(shownQuickPickOptions, { ignoreFocusOut: true, canPickMany: false })
      .then(selection => selection?.command && executeCommand(selection.command, ...(selection.commandArgs ?? [])));
  }

  async withStatusBarProgress<R>(options: StatusBarProgressOptions, action: () => Promise<R>): Promise<R | undefined> {
    const textDuring = options.text;
    const tooltip = newMarkdownString(options.tooltip ?? textDuring);
    const textSuccess = options.textSuccess ?? l10n.t('Success - {0}', textDuring);
    const textError = options.textError ?? l10n.t('Error - {0}', textDuring);
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
        tooltip: previousTooltip.appendMarkdown(
          `\n\n${DEFAULT_TOOLTIP_DIVIDER}\n\n**${l10n.t('Success last operation: {0}', textDuring)}**`
        ),
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
      previousTooltipError.appendMarkdown(`\n\n${DEFAULT_TOOLTIP_DIVIDER}\n\n**${l10n.t('Error last operation: {0}', textDuring)}**`);
      previousTooltipError.appendText(`\n\n${errorString}\n\n`);
      previousTooltipError.appendMarkdown(`\n\n${linksString}`);
      this.overrideStatusBar({
        text: textError,
        tooltip: previousTooltipError,
        icon: '$(error)',
        isError: true
      });
      logErrorMessageWithActions(`${textError} - ${errorString}`, {
        [l10n.t('Open Runtime Log')]: () => showRuntimeLog(),
        [l10n.t('Open Extension Log')]: () => showExtensionLog(),
        [l10n.t('Open Engine Log')]: () => showEngineLog()
      });
    }
  }

  private buildLogLinks() {
    const linkRuntimeLog = `[${l10n.t('Open Runtime Log')}](command:ivyPanelView.openRuntimeLog)`;
    const linkExtensionLog = `[${l10n.t('Open Extension Log')}](command:ivyPanelView.openExtensionLog)`;
    const linkEngineLog = `[${l10n.t('Open Engine Log')}](command:ivyPanelView.openEngineLog)`;
    return `${linkRuntimeLog} | ${linkExtensionLog} | ${linkEngineLog}`;
  }
}
