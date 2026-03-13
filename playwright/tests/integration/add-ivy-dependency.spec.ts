import { expect } from '@playwright/test';
import { test } from '../fixtures/baseTest';
import { Editor } from '../page-objects/editor';
import { FileExplorer } from '../page-objects/explorer-view';
import { multiProjectWorkspacePath } from '../workspaces/workspace';

test.describe(() => {
  test.use({ workspace: multiProjectWorkspacePath });

  test('Add Ivy Project Dependency', async ({ page }) => {
    const explorer = new FileExplorer(page);
    await explorer.hasDeployProjectStatusMessage();
    await explorer.selectNode('ivy-project-1');
    await explorer.doubleClickNode('pom.xml');

    const editor = new Editor('pom.xml', page);
    await expect(editor.editorContent()).toContainText(
      /<dependencies>\s*<dependency>\s*<groupId>com\.axonivy\.ivy\.api<\/groupId>\s*<artifactId>ivy-api<\/artifactId>\s*<\/dependency>\s*<\/dependencies>/
    );

    await page.locator('div.editor-actions').getByLabel('Add Ivy Project Dependency').click();
    await page.locator('div.quick-input-widget').getByLabel('connector').click();

    await expect(editor.editorContent()).toContainText(
      /<dependency>\s*<groupId>com\.axonivy\.test<\/groupId>\s*<artifactId>connector<\/artifactId>\s*<version>\$\{project\.version\}<\/version>\s*<type>iar<\/type>\s*<\/dependency>/
    );
  });
});
