import { FeatureModule, type IContextMenuService, TYPES } from '@eclipse-glsp/client';

const noopContextMenuServiceModule = new FeatureModule((bind, _unbind, isBound) => {
  if (!isBound(TYPES.IContextMenuService)) {
    // there is no context menu service for VS code yet, see https://github.com/eclipse-glsp/glsp/issues/414
    // we want to avoid the console warning: https://github.com/eclipse-glsp/glsp-client/blob/e7dec9bd52b9688a7a23005c3f7de652d0e85923/packages/client/src/features/context-menu/context-menu-module.ts#L25
    bind<IContextMenuService>(TYPES.IContextMenuService).toConstantValue({ show: () => {} });
  }
});

export default noopContextMenuServiceModule;
