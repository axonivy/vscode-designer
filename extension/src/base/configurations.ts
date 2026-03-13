import * as vscode from 'vscode';
import { AnimationFollowMode } from '../engine/animation';

const configs = () => vscode.workspace.getConfiguration();

export const config = {
  engineRunByExtension: () => configs().get<boolean>('axonivy.engine.runByExtension'),
  engineReleaseTrain: () => configs().get<string>('axonivy.engine.releaseTrain'),
  engineUrl: () => configs().get<string>('axonivy.engine.url'),
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
