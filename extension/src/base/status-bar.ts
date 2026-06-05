import { extensions, MarkdownString, QuickPickItemKind, StatusBarAlignment, ThemeColor, window, type StatusBarItem } from 'vscode';
import { IvyEngineManager } from '../engine/engine-manager';
import { getWebIdeWebSocketReadyState, onWebIdeWebSocketStateChange } from '../engine/web-ide-ws/web-ide-websocket-provider';
import { IvyProjectExplorer } from '../project-explorer/ivy-project-explorer';
import { executeCommand } from './commands';
import { animationSettings, onAnimationSettingsChange } from './configurations';

const DEFAULT_TEXT = 'Ready';
const DEFAULT_ICON: StatusBarIcon = '$(ivy-logo)';
const DEFAULT_PREFIX = 'Axon Ivy';
const DEFAULT_PRIORITY = 1;
const DEFAULT_SUCCESS_MESSAGE_DURATION = 3_000;

type StatusBarIcon = '$(ivy-logo)' | '$(loading~spin)' | '$(error)' | '$(check)' | '$(plug)' | '$(debug-disconnect)';

interface StatusBarItemOptions {
  text?: string;
  hoverTitle?: string;
  hoverOverride?: MarkdownString;
  hoverMarkdown?: MarkdownString;
  icon?: StatusBarIcon;
  prefix?: string;
  isError?: boolean;
  isClickable?: boolean;
  visibleOptions?: string[];
}

interface StatusBarProgressOptions {
  text?: string;
  textDuring?: string;
  hoverTitle?: string;
  hoverOverrideDuring?: MarkdownString;
  hoverMarkdownDuring?: MarkdownString;
  textSuccess?: string;
  hoverMarkdownSuccess?: MarkdownString;
  textError?: string;
  prefix?: string;
  successMsgDuration?: number;
}

interface ConnectionStateDescriptor {
  label: string;
  icon: StatusBarIcon;
  color?: ThemeColor;
}

export class StatusBar {
  private static instance: StatusBar | undefined;

  private statusBarItem: StatusBarItem | undefined;
  private temporaryTimeout: ReturnType<typeof setTimeout> | undefined;
  private hoverRefreshVersion = 0;
  private listenersSubscribed = false;
  private hasTemporaryOverride = false;

  private constructor() {
    // Singleton
  }

  static getInstance(): StatusBar {
    if (!StatusBar.instance) {
      StatusBar.instance = new StatusBar();
    }
    return StatusBar.instance;
  }

  static async withStatusBarProgress<R>(options: StatusBarProgressOptions, action: () => Promise<R>): Promise<R> {
    return await StatusBar.getInstance().withStatusBarProgress(options, action);
  }

  static newMarkdownString(text: string) {
    const markdown = new MarkdownString(text, true);
    markdown.supportThemeIcons = true;
    return markdown;
  }

  static setStatusBarItem(opt: StatusBarItemOptions) {
    StatusBar.getInstance().setStatusBarItem(opt);
  }

  static showStatusBarQuickPick(visibleOptions?: string[]) {
    StatusBar.getInstance().showStatusBarQuickPick(visibleOptions);
  }

  subscribeToReadyStatus() {
    if (this.listenersSubscribed) {
      return;
    }
    this.listenersSubscribed = true;

    onWebIdeWebSocketStateChange(() => {
      if (!this.hasTemporaryOverride) {
        this.renderDefault();
      }
    });

    onAnimationSettingsChange(() => {
      if (!this.hasTemporaryOverride) {
        this.refreshDefaultHoverMarkdown();
      }
    });
  }

  private resolveConnectionState(): ConnectionStateDescriptor {
    switch (getWebIdeWebSocketReadyState()) {
      case WebSocket.CONNECTING:
        return {
          label: 'Connecting',
          icon: '$(loading~spin)',
          color: new ThemeColor('statusBarItem.warningForeground')
        };
      case WebSocket.OPEN:
        return {
          label: 'Connected',
          icon: '$(plug)'
        };
      case WebSocket.CLOSING:
        return {
          label: 'Closing',
          icon: '$(debug-disconnect)',
          color: new ThemeColor('statusBarItem.warningForeground')
        };
      case WebSocket.CLOSED:
        return {
          label: 'Closed',
          icon: '$(debug-disconnect)',
          color: new ThemeColor('statusBarItem.errorForeground')
        };
      default:
        return {
          label: DEFAULT_TEXT,
          icon: DEFAULT_ICON
        };
    }
  }

  private getStatusBarItem() {
    if (!this.statusBarItem) {
      this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, DEFAULT_PRIORITY);
      this.statusBarItem.command = 'ivy.showStatusBarQuickPick';
      this.subscribeToReadyStatus();
    }
    return this.statusBarItem;
  }

  private refreshDefaultHoverMarkdown(hoverTitle?: string) {
    if (!this.statusBarItem) {
      return;
    }
    const refreshVersion = ++this.hoverRefreshVersion;
    void this.buildDefaultHoverMarkdown(this.statusBarItem, refreshVersion, hoverTitle);
  }

  private async buildDefaultHoverMarkdown(item: StatusBarItem, refreshVersion = ++this.hoverRefreshVersion, hoverTitle?: string) {
    const connectionState = this.resolveConnectionState();
    const markdown = StatusBar.newMarkdownString(hoverTitle ?? `### ${connectionState.label}`);
    markdown.appendMarkdown('\n\n' + this.buildEngineStatusString(connectionState));
    markdown.appendMarkdown('\n\n' + this.buildAnimationStatusString());
    markdown.appendMarkdown('\n\n' + (await this.buildProjectCountString()));
    markdown.appendMarkdown(`\n\n Engine Version ${await this.buildEngineVersionString()}`);
    markdown.appendMarkdown(`\n\n Extension Version ${extensions.getExtension('axonivy.vscode-designer-14')?.packageJSON.version}`);
    markdown.appendMarkdown(
      (await IvyEngineManager.instance.resolveEngineDir()) ??
        '\n\n Engine directory cannot be resolved when "Run Engine by Extension" is disabled.'
    );
    if (refreshVersion === this.hoverRefreshVersion) {
      item.tooltip = markdown;
    }
  }

  private async buildProjectCountString() {
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
  }

  private buildEngineStatusString(connectionState: ConnectionStateDescriptor) {
    let engineStatusString = '**Axon Ivy Engine Status**';

    const engineUrl = IvyEngineManager.instance.engineUrl;
    const engineUrlLink = engineUrl ? `[${engineUrl}](${engineUrl})` : 'Engine URL cannot be resolved';

    engineStatusString += `\n\n- Status: ${connectionState.icon} ${connectionState.label}`;
    engineStatusString += `\n\n- URL: ${engineUrlLink}`;

    return engineStatusString;
  }

  private buildAnimationStatusString() {
    let animationStatusString = 'Animation is ';
    animationStatusString += animationSettings().animate ? 'ON' : 'OFF';
    animationStatusString += ` (Speed: ${animationSettings().speed})`;
    return animationStatusString;
  }

  private async buildEngineVersionString() {
    return await IvyEngineManager.instance.getEngineVersion();
  }

  private renderDefault(hoverTitle?: string) {
    if (this.temporaryTimeout) {
      clearTimeout(this.temporaryTimeout);
      this.temporaryTimeout = undefined;
    }

    this.hasTemporaryOverride = false;
    const item = this.getStatusBarItem();
    const connectionState = this.resolveConnectionState();

    item.text = `${connectionState.icon} ${DEFAULT_PREFIX}: ${connectionState.label}`;
    item.color = connectionState.color;
    item.backgroundColor = undefined;
    item.command = 'ivy.showStatusBarQuickPick';
    this.refreshDefaultHoverMarkdown(hoverTitle);
    item.show();
  }

  setStatusBarItem(opt: StatusBarItemOptions) {
    const hoverOverride = opt.hoverOverride ?? opt.hoverMarkdown;
    const isDefaultStateRequest =
      opt.text === undefined &&
      hoverOverride === undefined &&
      opt.icon === undefined &&
      opt.prefix === undefined &&
      opt.isError === undefined &&
      opt.isClickable === undefined &&
      opt.visibleOptions === undefined;

    if (isDefaultStateRequest) {
      this.renderDefault(opt.hoverTitle);
      return;
    }

    const item = this.getStatusBarItem();
    const isError = opt.isError ?? false;
    const isClickable = opt.isClickable ?? true;

    this.hasTemporaryOverride = true;
    item.color = undefined;
    item.text = `${opt.icon ?? DEFAULT_ICON} ${opt.prefix ?? DEFAULT_PREFIX}: ${opt.text ?? DEFAULT_TEXT}`;
    item.backgroundColor = isError ? new ThemeColor('statusBarItem.errorBackground') : undefined;
    item.command = isClickable
      ? { title: 'Show Axon Ivy actions', command: 'ivy.showStatusBarQuickPick', arguments: [opt.visibleOptions] }
      : undefined;

    if (hoverOverride) {
      item.tooltip = hoverOverride;
    } else {
      this.refreshDefaultHoverMarkdown(opt.hoverTitle);
    }

    item.show();
  }

  showStatusBarQuickPick(visibleOptions?: string[]) {
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
  }

  async withStatusBarProgress<R>(options: StatusBarProgressOptions, action: () => Promise<R>): Promise<R> {
    const textDuring = options.textDuring ?? options.text ?? DEFAULT_TEXT;
    const textSuccess = options.textSuccess ?? `Success: ${textDuring}`;
    const textError = options.textError ?? `Error: ${textDuring}`;
    const prefix = options.prefix ?? DEFAULT_PREFIX;
    const successMsgDuration = options.successMsgDuration ?? DEFAULT_SUCCESS_MESSAGE_DURATION;

    if (this.temporaryTimeout) {
      clearTimeout(this.temporaryTimeout);
      this.temporaryTimeout = undefined;
    }

    this.setStatusBarItem({
      text: textDuring,
      icon: '$(loading~spin)',
      prefix,
      hoverOverride:
        options.hoverOverrideDuring ?? options.hoverMarkdownDuring ?? StatusBar.newMarkdownString(`In Progress: ${textDuring}`),
      isClickable: false
    });

    try {
      const result = await action();
      this.setStatusBarItem({
        text: textSuccess,
        icon: '$(check)',
        prefix,
        hoverOverride: options.hoverMarkdownSuccess ?? StatusBar.newMarkdownString(`${textSuccess}`)
      });
      this.temporaryTimeout = setTimeout(() => {
        this.renderDefault();
        this.temporaryTimeout = undefined;
      }, successMsgDuration);
      return result;
    } catch (error) {
      this.setStatusBarItem({
        text: textError,
        icon: '$(error)',
        prefix,
        isError: true,
        hoverOverride: StatusBar.newMarkdownString(`${error instanceof Error ? error.message : textError}`)
      });
      throw error;
    }
  }
}
