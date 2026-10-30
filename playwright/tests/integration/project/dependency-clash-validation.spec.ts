import { test } from '~/fixtures/baseTest';
import { ProblemsView } from '~/page-objects/problems-view';
import { dependencyClashWorkspacePath } from '~/workspaces/workspace';

test.describe('Dependency clash validation', () => {
  test.use({ workspace: dependencyClashWorkspacePath });

  test('Ensure dependency clash is detected', async ({ wsPage }) => {
    const problemsView = await ProblemsView.initProblemsView(wsPage);
    await problemsView.hasError("Dependency 'excel-connector' conflicts with a workspace project");
    await problemsView.hasError("Dependency 'tel-search-ch-connector' is available in multiple versions: 12.0.0, 13.2.0");
  });
});
