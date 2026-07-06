import type { WorkspacePage } from './workspace-page';

export const webViewFrameLocator = (wsPage: WorkspacePage, nthFrame = 0) => {
  return wsPage.page
    .locator('iFrame.webview.ready')
    .nth(nthFrame)
    .contentFrame()
    .locator('iFrame#active-frame')
    .contentFrame()
    .locator('body');
};
