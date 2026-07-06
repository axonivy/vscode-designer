import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { TextEditor } from '~/page-objects/editor';
import { FileExplorer } from '~/page-objects/explorer-view';
import { multiProjectWorkspacePath } from '~/workspaces/workspace';

test.use({ workspace: multiProjectWorkspacePath });

test('Add Ivy Project Dependency', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.selectNode('ivy-project-1');
  await explorer.doubleClickNode('pom.xml');

  const editor = new TextEditor(wsPage, 'pom.xml');
  await expect(editor.content).toContainText(
    /<dependencies>\s*<dependency>\s*<groupId>com\.axonivy\.ivy\.api<\/groupId>\s*<artifactId>ivy-api<\/artifactId>\s*<\/dependency>\s*<\/dependencies>/
  );

  await wsPage.page.locator('div.editor-actions').getByLabel('Add Ivy Project Dependency').click();
  await wsPage.page.locator('div.quick-input-widget').getByLabel('connector').click();

  await expect(editor.content).toContainText(
    /<dependency>\s*<groupId>com\.axonivy\.test<\/groupId>\s*<artifactId>connector<\/artifactId>\s*<version>\$\{project\.version\}<\/version>\s*<type>iar<\/type>\s*<\/dependency>/
  );
});
