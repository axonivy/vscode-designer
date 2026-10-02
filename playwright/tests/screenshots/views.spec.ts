import { expect, test } from '~/fixtures/baseTest';
import { OutputView } from '~/page-objects/output-view';
import { ProblemsView } from '~/page-objects/problems-view';
import { ProcessEditor } from '~/page-objects/process-editor';
import { VsDebugView } from '~/page-objects/vs-debug-view';
import { outdatedProjectWorkspacePath, screenshotProject } from '~/workspaces/workspace';
import { screenshot, screenshotLocator } from './screenshot-util';

test.describe('outdated project', () => {
  test.use({ workspace: outdatedProjectWorkspacePath });

  test('problems', async ({ wsPage }) => {
    const problems = await ProblemsView.initProblemsView(wsPage);
    const marker = problems.marker.locator(`.monaco-tl-row:has-text("Project is too old")`).first();
    await expect(marker).toBeVisible();
    await marker.click();
    const quickFix = marker.locator('.markers-panel-action-quickfix');
    await quickFix.click();
    await wsPage.page.getByRole('menuitem', { name: 'Axon Ivy: Convert Project' }).hover();
    await screenshotLocator(wsPage.page, problems.view, 'problems-view', { marginTop: 50 });
  });
});

test.describe('screenshot project', () => {
  test.use({ workspace: screenshotProject });

  test('engine output', async ({ wsPage }) => {
    const output = new OutputView(wsPage);
    await output.openLog('Axon Ivy Runtime Log');

    const processEditor = new ProcessEditor(wsPage, 'quickstart.p.json');
    await processEditor.open();
    const start = processEditor.elementByPID('148655DDB7BB6588-f0');
    await expect(start).toBeVisible();
    await processEditor.startProcessAndAssertExecuted(start, start);

    await output.sourceSelection.click();
    await screenshotLocator(wsPage.page, output.view, 'output-view', { marginTop: 50 });
  });

  test('debug view', async ({ wsPage }) => {
    const processEditor = new ProcessEditor(wsPage, 'quickstart.p.json');
    await processEditor.open();
    const debugView = await VsDebugView.showDebugView(wsPage);
    await debugView.startDebugSession();

    const start = processEditor.elementByPID('148655DDB7BB6588-f0');
    await expect(start).toBeVisible();
    const dialog = processEditor.elementByPID('148655DDB7BB6588-f3');
    await processEditor.addBreakpoint(dialog);
    await debugView.assertBreakpoint('quickstart.p.json', '28');

    await wsPage.page.waitForTimeout(2_000); // ensure session is started
    await processEditor.startProcessAndAssertExecuted(start, dialog);
    await expect(dialog).toBeVisible();
    await processEditor.assertStopped(dialog);

    await wsPage.executeCommand('Browser: Close All Browser Tabs');
    await screenshot(wsPage.page, 'debug-view');
  });
});
