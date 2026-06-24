import { workspace, type Disposable } from 'vscode';
import type { McpOptions } from '../ai/tools/local-mcp';

type AnimationFollowMode = 'all' | 'currentProcess' | 'openProcesses' | 'noDialogProcesses' | 'noEmbeddedProcesses';

const configs = () => workspace.getConfiguration();

const localMcpConfig = (): McpOptions => ({
  enabled: configs().get<boolean>('axonivy.localMcp.enabled') ?? false,
  host: configs().get<string>('axonivy.localMcp.host') ?? '127.0.0.1',
  port: configs().get<number>('axonivy.localMcp.port') ?? 32140,
  exposeAllTools: configs().get<boolean>('axonivy.localMcp.exposeAllTools') ?? false
});

export const config = {
  engineRunByExtension: () => configs().get<boolean>('axonivy.engine.runByExtension'),
  engineReleaseTrain: () => configs().get<string>('axonivy.engine.releaseTrain'),
  engineUrl: () => configs().get<string>('axonivy.engine.url'),
  engineVmArgs: () => configs().get<string>('axonivy.engine.vmArgs'),
  localMcp: () => localMcpConfig(),
  projectExcludePattern: () => configs().get<string>('axonivy.project.excludePattern'),
  projectMaximumNumber: () => configs().get<number>('axonivy.project.maximumNumber'),
  processAnimationAnimate: () => configs().get<boolean>('axonivy.process.animation.animate'),
  processAnimationSpeed: () => configs().get<number>('axonivy.process.animation.speed'),
  processAnimationMode: () => configs().get<AnimationFollowMode>('axonivy.process.animation.mode'),

  setProcessAnimationAnimate: async (animate: boolean) => {
    await configs().update('axonivy.process.animation.animate', animate);
  },

  setReleaseTrainOnWorkspaceLevel: async (releaseTrain: string) => {
    await configs().update('axonivy.engine.releaseTrain', releaseTrain, false);
  }
};

export const animationSettings = () => ({
  animate: config.processAnimationAnimate() ?? true,
  speed: config.processAnimationSpeed() ?? 50,
  mode: config.processAnimationMode() ?? 'all'
});

export const onAnimationSettingsChange = (listener: () => void): Disposable => {
  return workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('axonivy.process.animation')) {
      listener();
    }
  });
};
