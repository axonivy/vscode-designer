import '@axonivy/vscode-webview-common/css/colors.css';
import '@eclipse-glsp/vscode-integration-webview/css/glsp-vscode.css';
import '../css/colors.css';
import '../css/diagram.css';

import {
  IVY_ACCESSIBILITY_MODULES,
  createIvyDiagramContainer,
  ivyBreakpointModule,
  ivyHistoryModule,
  ivyOpenDataClassModule,
  ivyOpenFormModule,
  ivyStandaloneCopyPasteModule
} from '@axonivy/process-editor';
import { ivyInscriptionModule } from '@axonivy/process-editor-inscription';
import { MonacoEditorUtil } from '@axonivy/process-editor-inscription-view';
import { type ContainerConfiguration, navigationModule } from '@eclipse-glsp/client';
import { GLSPStarter } from '@eclipse-glsp/vscode-integration-webview';
import { Container } from 'inversify';
import type { NotificationType } from 'vscode-messenger-common';
import { Messenger } from 'vscode-messenger-webview';
import noopContextMenuServiceModule from './context-menu/di.config';
import { initTranslation } from './i18n';
import ivyStartActionModule from './start/di.config';
import { ivyStartupDiagramModule } from './startup';

type ColorTheme = 'dark' | 'light';
const ColorThemeChangedNotification: NotificationType<ColorTheme> = { method: 'colorThemeChanged' };

class IvyGLSPStarter extends GLSPStarter {
  constructor() {
    super();
    this.messenger.onNotification(ColorThemeChangedNotification, theme => MonacoEditorUtil.setTheme(theme));
  }

  createContainer(...containerConfiguration: ContainerConfiguration): Container {
    return createIvyDiagramContainer(
      'sprotty',
      noopContextMenuServiceModule,
      ...containerConfiguration,
      ivyBreakpointModule,
      ivyStartActionModule,
      ivyInscriptionModule,
      ivyHistoryModule,
      ivyStartupDiagramModule,
      ivyStandaloneCopyPasteModule,
      ivyOpenDataClassModule,
      ivyOpenFormModule,
      navigationModule,
      ...IVY_ACCESSIBILITY_MODULES
    );
  }

  protected override addVscodeBindings(container: Container) {
    container.bind(Messenger).toConstantValue(this.messenger);
  }
}

export function launch() {
  initMonaco();
  initTranslation();
  new IvyGLSPStarter();
}

// Set in the createWebViewContent when the webview HTML code is generated
declare const editorWorkerLocation: string;

async function initMonaco(): Promise<unknown> {
  const theme = document.body.classList.contains('vscode-dark') ? 'dark' : 'light';
  // Web worker support within VS Code webviews is limited (see https://code.visualstudio.com/api/extension-guides/webview#using-web-workers).
  // Workers cannot load scripts from vscode-resource URIs directly, so we fetch the script and create a blob URL instead.
  await initEditorWorker();
  return MonacoEditorUtil.configureMonaco({ theme });
}

async function initEditorWorker(): Promise<void> {
  if (!editorWorkerLocation) {
    console.warn('Could not find editor worker location for web worker creation. Initialize without dedicated web worker support.');
    return;
  }
  try {
    console.info('Translate editor worker script from webview uri to blob: ' + editorWorkerLocation);
    const response = await fetch(editorWorkerLocation);
    if (!response.ok) {
      throw Error(`Failed to fetch editor worker: ${response.status} ${editorWorkerLocation}`);
    }
    const workerUrl = URL.createObjectURL(await response.blob());
    self.MonacoEnvironment = {
      getWorker: () => new Worker(workerUrl, { name: 'EditorWorker', type: 'module' })
    };
  } catch (error) {
    console.warn('Failed to load editor worker, falling back to main thread.', error);
  }
}
