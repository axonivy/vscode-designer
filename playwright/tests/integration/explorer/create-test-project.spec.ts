import fs from 'fs';
import path from 'path';
import { expect, test } from '~/fixtures/baseTest';
import { multiProjectWithoutDuplicatesWorkspacePath } from '~/workspaces/workspace';

test.describe('Add Test Project', () => {
  test.use({ workspace: multiProjectWithoutDuplicatesWorkspacePath });

  test('should create a test project', async ({ wsPage, tmpWorkspace }) => {
    await wsPage.hasReadyStatusMessage();

    await wsPage.executeCommand('Axon Ivy: New Test Project');
    await wsPage.provideUserInput('ivy-project-1');
    await wsPage.provideUserInput();
    await wsPage.provideUserInput('test.ivy.project');
    await wsPage.provideUserInput();
    const ivyTestOption = wsPage.quickInputList.getByText('IvyTest', { exact: true });
    const processTestOption = wsPage.quickInputList.getByText('ProcessTest', { exact: true });
    const webITOption = wsPage.quickInputList.getByText('WebIT', { exact: true });
    await ivyTestOption.click();
    await processTestOption.click();
    await webITOption.click();
    await wsPage.quickInputBox.press('Enter', { delay: 100 });

    const srcTest = path.join(tmpWorkspace!.tmpWorkspacePath, 'test-ivy-project-1', 'src_test');
    await expect(async () => {
      const files = await fs.promises.readdir(srcTest, { recursive: true });
      expect(files.map(file => path.basename(file))).toEqual(expect.arrayContaining(['SampleIvyTest.java', 'SampleProcessTest.java', 'SampleWebIT.java']));
    }).toPass();
  });
});

test.describe('Test Project already exists', () => {
  test.use({ workspace: multiProjectWithoutDuplicatesWorkspacePath });

  test('Existing Test Project', async ({ wsPage }) => {
    await wsPage.hasReadyStatusMessage();
    const projectName = 'ivy-project-1';
    await wsPage.executeCommand('Axon Ivy: New Test Project');
    await wsPage.provideUserInput(projectName);
    await wsPage.provideUserInput(projectName);
    await expect(wsPage.quickInputMessage).toBeVisible();
    await expect(wsPage.quickInputMessage).toHaveText('A test project with this name already exists in the workspace or as a Maven dependency.');
  });
});
