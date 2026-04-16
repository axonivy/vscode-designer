import { workspace } from 'vscode';

type AnimationFollowMode = 'all' | 'currentProcess' | 'openProcesses' | 'noDialogProcesses' | 'noEmbeddedProcesses';

const configs = () => workspace.getConfiguration();

export const config = {
  engineRunByExtension: () => configs().get<boolean>('axonivy.engine.runByExtension'),
  engineReleaseTrain: () => configs().get<string>('axonivy.engine.releaseTrain'),
  engineUrl: () => configs().get<string>('axonivy.engine.url'),
  engineDebugHost: () => configs().get<string>('axonivy.engine.debugHost'),
  engineDebugPort: () => configs().get<number>('axonivy.engine.debugPort'),
  engineVmArgs: () => configs().get<string>('axonivy.engine.vmArgs'),
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
