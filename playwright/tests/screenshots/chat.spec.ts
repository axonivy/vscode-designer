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
  await chatPage.openCustomizationsTools();
  await chatPage.setGroupExpanded('Built-in', false);
  expect(await chatPage.isGroupExpanded('User')).toBe(true);
  await chatPage.setGroupExpanded('Axon Ivy PRO Designer 14', true, 'New Axon Ivy project');

  await screenshotLocator(wsPage.page, chatPage.customizationsLocator, 'chat-configure-tools', {
    margin: 0,
    marginTop: 44,
    marginLeft: 12,
    marginRight: 3,
    marginBottom: 3
  });
});

test('chat: skills', async ({ wsPage }) => {
  const chatPage = new ChatPage(wsPage);
  await chatPage.skillsDialog();

  await screenshotLocator(wsPage.page, chatPage.skillsLocator, 'chat-axonivy-skills');
});
