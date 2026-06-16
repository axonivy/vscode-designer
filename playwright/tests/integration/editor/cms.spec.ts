import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { CmsEditor } from '~/page-objects/cms-editor';
import { FileExplorer, ProjectExplorerView } from '~/page-objects/explorer-view';
import { OutputView } from '~/page-objects/output-view';
import { TextEditor } from '~/page-objects/text-editor';

test('Open by command', async ({ wsPage }) => {
  const editor = new CmsEditor(wsPage);
  await new FileExplorer(wsPage.page).selectNode('cms');
  await wsPage.executeCommand('Axon Ivy: Open CMS Editor');
  await editor.expectWebViewVisible();
  await editor.hasContentObject('/contentObject');
});

test('Open by file and open text file', async ({ wsPage }) => {
  const editor = new CmsEditor(wsPage);
  await editor.open();
  await editor.hasContentObject('/contentObject');

  const detail = await editor.rowByName('/File/Text').openInscription();
  await detail.getByRole('button', { name: 'Open File' }).click();
  const fileEditor = new TextEditor(wsPage, 'Text_en.txt');
  await fileEditor.isTabVisible();
  await expect(fileEditor.content).toContainText(`This is a content object file`);
});

test('Open help', async ({ wsPage }) => {
  const editor = new CmsEditor(wsPage);
  await editor.open();
  const outputView = new OutputView(wsPage.page);
  await outputView.openLog('Axon Ivy Extension');
  await editor.help.click();

  await wsPage.page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*cms\/cms-editor.html/);
});

test('Reuse and reveal existing panel', async ({ wsPage }) => {
  const editor = new CmsEditor(wsPage);
  const explorer = new FileExplorer(wsPage.page);
  await explorer.selectNode('cms');
  await wsPage.executeCommand('Axon Ivy: Open CMS Editor');
  await editor.expectWebViewVisible();

  await explorer.doubleClickNode('pom.xml');
  await editor.expectTabInactive();
  await editor.open();
  await expect(editor.tab).toHaveCount(1);

  await explorer.doubleClickNode('pom.xml');
  await editor.expectTabInactive();
  const projectExplorer = new ProjectExplorerView(wsPage.page);
  await projectExplorer.openView();
  await projectExplorer.selectNode('playwrightTestWorkspace');
  await projectExplorer.selectNode('cms');
  await editor.expectWebViewVisible();
  await expect(editor.tab).toHaveCount(1);
});
