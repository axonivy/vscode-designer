import { QuickPickItemKind, StatusBarAlignment, ThemeColor, window, workspace, type StatusBarItem } from 'vscode';
import { executeCommand } from './commands';

const DEFAULT_TEXT = 'Ready';
const DEFAULT_ICON: StatusBarIcon = '$(ivy-logo)';
const DEFAULT_PREFIX = 'Axon Ivy';
const DEFAULT_PRIORITY = 1;
const DEFAULT_SUCCESS_MESSAGE_DURATION = 3_000;
const DEFAULT_FAILURE_MESSAGE_DURATION = 10_000;

type StatusBarIcon = '$(ivy-logo)' | '$(loading~spin)' | '$(error)' | '$(check)';

interface StatusBarItemOptions {
  text?: string;
  icon?: StatusBarIcon;
  prefix?: string;
  isError?: boolean;
  isClickable?: boolean;
}

interface StatusBarProgressOptions {
  textDuring: string;
  textSuccess: string;
  textFailure: string;
  prefix?: string;
  successMsgDuration?: number;
  failureMsgDuration?: number;
}

let statusBarItem: StatusBarItem | undefined;
let temporaryTimeout: ReturnType<typeof setTimeout> | undefined;

const getStatusBarItem = () => {
  if (!statusBarItem) {
    statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, DEFAULT_PRIORITY);
    statusBarItem.command = 'ivy.showStatusBarQuickPick';
  }
  return statusBarItem;
};

const resetToDefault = () => {
  const item = getStatusBarItem();
  item.text = `${DEFAULT_ICON} ${DEFAULT_PREFIX}: ${DEFAULT_TEXT}`;
  item.backgroundColor = undefined;
  item.show();
};

export const setStatusBarMessage = (text: string) => {
  window.setStatusBarMessage(text, 5_000);
};

export const setStatusBarItem = (opt: StatusBarItemOptions) => {
  const item = getStatusBarItem();
  const isError = opt.isError ?? false;
  const isClickable = opt.isClickable ?? true;
  item.text = `${opt.icon ?? DEFAULT_ICON} ${opt.prefix ?? DEFAULT_PREFIX}: ${opt.text ?? DEFAULT_TEXT}`;
  item.backgroundColor = isError ? new ThemeColor('statusBarItem.errorBackground') : undefined;
  item.command = isClickable ? 'ivy.showStatusBarQuickPick' : undefined;
  item.show();
};

export const showStatusBarQuickPick = () => {
  const animationIsOn = workspace.getConfiguration('axonivy.process.animation').get<boolean>('animate');
  const quickPickOptions = [
    { label: '🔧 Open Axon Ivy Settings' },
    { label: '🔧 Open Axon Ivy Runtime Log' },
    { label: '🚀 Deploy all Axon Ivy Projects' },
    { label: '🚀 Deploy Axon Ivy Project' },
    { label: '', kind: QuickPickItemKind.Separator },
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
    { label: '', kind: QuickPickItemKind.Separator },
    { label: 'Install Market Product' },
    { label: 'Install Local Market Product' },
    { label: '', kind: QuickPickItemKind.Separator },
    { label: animationIsOn ? 'Deactivate Animation' : 'Activate Animation' }
  ];

  window.showQuickPick(quickPickOptions, { ignoreFocusOut: true, canPickMany: false }).then(selection => {
    if (!selection) {
      return;
    }
    switch (selection.label) {
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
  const { textDuring, textSuccess, textFailure, prefix, successMsgDuration, failureMsgDuration } = options;

  if (temporaryTimeout) {
    clearTimeout(temporaryTimeout);
    temporaryTimeout = undefined;
  }

  setStatusBarItem({ text: textDuring, icon: '$(loading~spin)', prefix: prefix });

  try {
    const result = await action();
    setStatusBarItem({ text: textSuccess, icon: '$(check)', prefix: prefix });
    temporaryTimeout = setTimeout(() => {
      resetToDefault();
      temporaryTimeout = undefined;
    }, successMsgDuration ?? DEFAULT_SUCCESS_MESSAGE_DURATION);
    return result;
  } catch (error) {
    setStatusBarItem({ text: textFailure, icon: '$(error)', prefix: prefix, isError: true });
    temporaryTimeout = setTimeout(() => {
      resetToDefault();
      temporaryTimeout = undefined;
    }, failureMsgDuration ?? DEFAULT_FAILURE_MESSAGE_DURATION);
    throw error;
  }
};
