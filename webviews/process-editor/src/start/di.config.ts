import { IVY_TYPES, StarProcessQuickActionProvider } from '@axonivy/process-editor';
import { StartProcessAction } from '@axonivy/process-editor-protocol';
import { FeatureModule, configureActionHandler } from '@eclipse-glsp/client';
import { StartProcessActionHandler } from './action';

const ivyStartActionModule = new FeatureModule((bind, _unbind, isBound) => {
  bind(IVY_TYPES.QuickActionProvider).to(StarProcessQuickActionProvider);
  configureActionHandler({ bind, isBound }, StartProcessAction.KIND, StartProcessActionHandler);
});

export default ivyStartActionModule;
