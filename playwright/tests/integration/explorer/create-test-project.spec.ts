import fs from 'fs';
import path from 'path';
import { expect, test } from '~/fixtures/baseTest';
import { properMultiProjectPath } from '~/workspaces/workspace';

test.describe('Add Test Project', () => {
  test.use({ workspace: properMultiProjectPath });

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
    }).toPass({ intervals: [1_000] });
  });

  test('should create IvyTests and tests should pass', async ({ wsPage, tmpWorkspace }) => {
    await wsPage.hasReadyStatusMessage();

    await wsPage.executeCommand('Axon Ivy: New Test Project');
    await wsPage.provideUserInput('ivy-project-1');
    await wsPage.provideUserInput();
    await wsPage.provideUserInput('test.ivy.project');
    await wsPage.provideUserInput('test.ivy.project.1');
    const ivyTestOption = wsPage.quickInputList.getByText('IvyTest', { exact: true });
    await ivyTestOption.click();
    await wsPage.quickInputBox.press('Enter', { delay: 100 });

    // the sample test is written after all pom.xml edits: interacting earlier lets keyboard input land in the pom.xml editor
    const srcTest = path.join(tmpWorkspace!.tmpWorkspacePath, 'test-ivy-project-1', 'src_test');
    await expect(async () => {
      const files = await fs.promises.readdir(srcTest, { recursive: true });
      expect(files.map(file => path.basename(file))).toContain('SampleIvyTest.java');
    }).toPass({ intervals: [1_000] });

    await wsPage.openEditorFile('SampleIvyTest.java');
    await wsPage.runTests();
    await wsPage.expectTestsToPass();
  });

  test('should create ProcessTests and tests should pass', async ({ wsPage, tmpWorkspace }) => {
    await wsPage.hasReadyStatusMessage();

    await wsPage.executeCommand('Axon Ivy: New Test Project');
    await wsPage.provideUserInput('ivy-project-1');
    await wsPage.provideUserInput();
    await wsPage.provideUserInput('test.ivy.project');
    await wsPage.provideUserInput('test.ivy.project.1');
    const processTestOption = wsPage.quickInputList.getByText('ProcessTest', { exact: true });
    await processTestOption.click();
    await wsPage.quickInputBox.press('Enter', { delay: 100 });

    // the sample test is written after all pom.xml edits: interacting earlier lets keyboard input land in the pom.xml editor
    const srcTest = path.join(tmpWorkspace!.tmpWorkspacePath, 'test-ivy-project-1', 'src_test');
    await expect(async () => {
      const files = await fs.promises.readdir(srcTest, { recursive: true });
      expect(files.map(file => path.basename(file))).toContain('SampleProcessTest.java');
    }).toPass({ intervals: [1_000] });

    await wsPage.openEditorFile('SampleProcessTest.java');
    await wsPage.runTests();
    await wsPage.expectTestsToPass();
  });
});

test.describe('WebIT Test Project', () => {
  test.use({ workspace: properMultiProjectPath });
  test.skip(process.env.RUN_IN_BROWSER === 'true');

  test('should create WebIT and tests should pass', async ({ wsPage, tmpWorkspace }) => {
    await wsPage.hasReadyStatusMessage();

    await wsPage.executeCommand('Axon Ivy: New Test Project');
    await wsPage.provideUserInput('ivy-project-1');
    await wsPage.provideUserInput();
    await wsPage.provideUserInput('test.ivy.project');
    await wsPage.provideUserInput('test.ivy.project.1');
    const webITOption = wsPage.quickInputList.getByText('WebIT', { exact: true });
    await webITOption.click();
    await wsPage.quickInputBox.press('Enter', { delay: 100 });

    // the sample test is written after all pom.xml edits: interacting earlier lets keyboard input land in the pom.xml editor
    const srcTest = path.join(tmpWorkspace!.tmpWorkspacePath, 'test-ivy-project-1', 'src_test');
    await expect(async () => {
      const files = await fs.promises.readdir(srcTest, { recursive: true });
      expect(files.map(file => path.basename(file))).toContain('SampleWebIT.java');
    }).toPass({ intervals: [1_000] });

    await wsPage.openEditorFile('SampleWebIT.java');
    await wsPage.runTests();
    await wsPage.expectTestsToPass();
  });
});

test.describe('Test Project already exists', () => {
  test.use({ workspace: properMultiProjectPath });

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
