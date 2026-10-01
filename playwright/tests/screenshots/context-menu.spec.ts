import { expect, test } from '~/fixtures/baseTest';
import { FileExplorer, ProjectExplorerView } from '~/page-objects/explorer-view';
import { screenshotProject } from '~/workspaces/workspace';
import { DEFAULT_MARGIN, screenshotClip, screenshotLocator } from './screenshot-util';

test.use({ workspace: screenshotProject });

test('file explorer', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.view.getByText('process').click({ button: 'right' });
  await wsPage.page.getByRole('menuitem', { name: 'Axon Ivy' }).hover();
  await wsPage.page.getByRole('menuitem', { name: 'New', exact: true }).hover();
  await wsPage.page.getByRole('menuitem', { name: 'Process' }).hover();
  await wsPage.page.getByRole('menuitem', { name: 'New Business Process' }).hover();

  const menuBound = await wsPage.page.locator('.monaco-menu:visible').last().boundingBox();
  if (!menuBound) {
    throw new Error(`Could not get bounding box for screenshot 'context-menu'`);
  }
  const right = menuBound.x + menuBound.width + DEFAULT_MARGIN;
  const bottom = menuBound.y + menuBound.height + DEFAULT_MARGIN;

  await screenshotClip(wsPage.page, { x: 0, y: 0, width: right, height: bottom }, 'axonivy-context-menu');

  await wsPage.page.getByRole('menuitem', { name: 'New Business Process' }).click();
  await expect(wsPage.quickInputTitle).toHaveText('Add New Business Process - Choose name (2/3)');
  await screenshotLocator(wsPage.page, wsPage.quickInputWidget, 'axonivy-new-process-dialog-2');

  await wsPage.quickInputWidget.getByRole('button', { name: 'Back' }).click();
  await expect(wsPage.quickInputTitle).toHaveText('Add New Business Process - Choose project (1/3)');
  await screenshotLocator(wsPage.page, wsPage.quickInputWidget, 'axonivy-new-process-dialog-1');

  await wsPage.quickInputBox.locator('input.input').clear();
  await screenshotLocator(wsPage.page, wsPage.quickInputWidget, 'axonivy-new-process-dialog-1-empty');
});

test('project explorer', async ({ wsPage }) => {
  const explorer = new ProjectExplorerView(wsPage);
  await explorer.openView();
  await explorer.view.getByText('screenshotProject').click({ button: 'right' });
  await wsPage.page.getByRole('menuitem', { name: 'Deploy Project' }).hover();
  await screenshotLocator(wsPage.page, wsPage.page.locator('.monaco-menu:visible'), 'project-context-menu', { marginLeft: 200, marginTop: 50 });
});
