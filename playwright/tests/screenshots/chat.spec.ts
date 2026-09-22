import { expect, test } from '~/fixtures/baseTest';
import { ChatPage } from '~/page-objects/chat';
import { screenshotProject } from '~/workspaces/workspace';
import { screenshotLocator, withViewportHeightRatio } from './screenshot-util';

test.use({ workspace: screenshotProject });

test('chat: window', async ({ wsPage }) => {
  await wsPage.openEditorFile('pom.xml');
  const chatPage = new ChatPage(wsPage);
  await chatPage.open();
  await withViewportHeightRatio(wsPage.page, 0.4, () => screenshotLocator(wsPage.page, chatPage.chatArea, 'chat-window'));
});

test('chat: tools', async ({ wsPage }) => {
  const chatPage = new ChatPage(wsPage);
  await chatPage.toolsDialog();
  await chatPage.expandGroup('Built-In', false);
  await chatPage.expandGroup('Axon Ivy PRO Designer 14', true);

  await expect(wsPage.page.getByRole('checkbox', { name: /^newAxonIvy/ })).toHaveCount(4);
  await screenshotLocator(wsPage.page, chatPage.toolsLocator, 'chat-configure-tools');
});

test('chat: skills', async ({ wsPage }) => {
  const chatPage = new ChatPage(wsPage);
  await chatPage.skillsDialog();

  await screenshotLocator(wsPage.page, chatPage.skillsLocator, 'chat-axonivy-skills');
});
