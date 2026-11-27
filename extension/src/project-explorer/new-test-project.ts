import path from 'path';
import { l10n, Range, Uri, window, workspace, WorkspaceEdit, type QuickPickItem } from 'vscode';
import { runJavaProjectImport } from '../base/java-extension-api';
import { logErrorMessage } from '../base/logging-util';
import type { CreateProjectParams } from '../engine/api/engine-api';
import type { ProjectBean } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { addMavenProjectDependencyByPath, addMavenTestDependency } from '../maven/add-dependency';
import type { AddCommandSelectionContext } from './ivy-project-explorer';
import {
  InputFlowAction,
  MultiStepCancelledError,
  MultiStepInput,
  MultiStepInvalidStateError,
  resolveAddCommandSelectionContext,
  type InputStep,
  type MSStateBase,
  type ProjectSelection
} from './utils/multi-step-input';
import {
  resolveDefaultNamespace,
  validateDotSeparatedName,
  validateProjectArtifactId,
  validateProjectName as validateTestProjectNameSyntax,
  type ResourceDirectoryTarget
} from './utils/util';

interface NewTestProjectState extends MSStateBase {
  projectName?: string | undefined;
  projectPath?: string | undefined;
  groupId?: string | undefined;
  projectId?: string | undefined;
  projectReference?: ProjectSelection | undefined;
  testSelections?: QuickPickItem[];
  projectFromSelection?: ProjectSelection | undefined;
}

const processName = 'ProcessForTest';

const testTemplates = [
  {
    selection: 'IvyTest',
    detail: l10n.t('Write unit tests for Java classes that run in the Ivy environment.'),
    template: 'ivy-test.java.template',
    output: 'SampleIvyTest.java'
  },
  {
    selection: 'IvyProcessTest',
    detail: l10n.t('Write unit tests for your processes.'),
    template: 'ivy-process-test.java.template',
    output: 'SampleIvyProcessTest.java'
  },
  {
    selection: 'IvyWebTest',
    detail: l10n.t('Write browser-based UI tests for your HTML Dialogs.'),
    template: 'ivy-web-test-it.java.template',
    output: 'SampleIvyWebTestIT.java'
  }
];

const getWebTestWarning = (testSelections: QuickPickItem[]) => {
  const selected = new Set(testSelections.map(test => test.label));
  if (selected.has('IvyWebTest') && selected.size > 1) {
    return l10n.t('Best practice: keep IvyWebTest in its own test project, because it changes the packaging to iar-integration-test.');
  }
};

const confirmWarning = async (message: string): Promise<boolean> => {
  const continueLabel = l10n.t('Continue');
  const goBackLabel = l10n.t('Go Back');
  const choice = await window.showWarningMessage(message, { modal: true }, continueLabel, goBackLabel);

  if (choice === continueLabel) {
    return true;
  }
  if (choice === goBackLabel) {
    return false;
  }

  throw InputFlowAction.cancel;
};

const configureTestProject = async (testProject: ProjectBean, testSelections: QuickPickItem[], extensionUri: Uri) => {
  const selected = new Set(testSelections.map(test => test.label));

  const needsUnitTester = selected.has('IvyTest') || selected.has('IvyProcessTest');
  const needsWebTester = selected.has('IvyWebTest');

  if (needsUnitTester) {
    await addMavenTestDependency(testProject.projectDirectory, {
      groupId: 'com.axonivy.ivy.api.test',
      artifactId: 'ivy-test-api'
    });
  }

  if (needsWebTester) {
    await addMavenTestDependency(testProject.projectDirectory, {
      groupId: 'com.axonivy.ivy.api.test',
      artifactId: 'ivy-web-test-api'
    });
    await setMavenPackaging(testProject.projectDirectory);
  }

  for (const item of testTemplates) {
    if (!selected.has(item.selection)) {
      continue;
    }

    const packageName = `${testProject.defaultNamespace}.${item.selection === 'IvyWebTest' ? 'webtest' : 'test'}`;
    const processPath = `${testProject.groupId.split('.').join('/')}/${processName}`;
    const templateUri = Uri.joinPath(extensionUri, 'assets', 'test-project-templates', item.template);
    const templateBytes = await workspace.fs.readFile(templateUri);
    const javaSource = new TextDecoder()
      .decode(templateBytes)
      .replace('{{packageName}}', packageName)
      .replace('{{ProcessForTest}}', processPath);
    const outputDir = Uri.joinPath(Uri.file(testProject.projectDirectory), 'src_test', ...packageName.split('.'));
    await workspace.fs.createDirectory(outputDir);

    const outputFile = Uri.joinPath(outputDir, item.output);
    await workspace.fs.writeFile(outputFile, new TextEncoder().encode(javaSource));
  }
};

const setMavenPackaging = async (projectDirectory: string) => {
  const pomUri = Uri.joinPath(Uri.file(projectDirectory), 'pom.xml');
  const document = await workspace.openTextDocument(pomUri);
  const match = document.getText().match(/<packaging>iar<\/packaging>/);
  if (match?.index === undefined) {
    throw new Error(`Could not find <packaging>iar</packaging> in ${pomUri.fsPath}.`);
  }
  const edit = new WorkspaceEdit();
  edit.replace(
    pomUri,
    new Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length)),
    `<packaging>iar-integration-test</packaging>`
  );
  if (!(await workspace.applyEdit(edit)) || !(await document.save())) {
    throw new Error(`Could not set packaging to iar-integration-test in ${pomUri.fsPath}.`);
  }
};

export const addNewTestProject = async (selectionContext: AddCommandSelectionContext, extensionUri: Uri) => {
  const validateTestProjectName = (typedTestProjectName: string): string | undefined => {
    return validateTestProjectNameSyntax(typedTestProjectName) ?? validateNotExisting(typedTestProjectName, existingDeployedProjects);
  };

  const validateNotExisting = (typedTestProjectName: string, existingTestProjects: ProjectBean[]): string | undefined => {
    if (existingTestProjects.some(project => project.id.name === typedTestProjectName)) {
      return l10n.t('A test project with this name already exists in the workspace or as a Maven dependency.');
    }
  };

  const resourceDirectoryTarget: ResourceDirectoryTarget = 'process';
  const existingProjects = selectionContext.existingIvyProjects;
  const { projectFromSelection } = await resolveAddCommandSelectionContext(selectionContext, resourceDirectoryTarget);

  const stepProject: InputStep<NewTestProjectState> = async (input: MultiStepInput<NewTestProjectState>, state: NewTestProjectState) => {
    if (state.projectFromSelection && state.projectReference === undefined) {
      state.projectReference = state.projectFromSelection;
      state.projectFromSelection = undefined;
    } else {
      state.projectReference = await input.showQuickPick<ProjectSelection>({
        title: state.dialogTitle,
        titleSuffix: l10n.t('Choose a reference project'),
        placeholder: l10n.t('Select one of the available projects'),
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
        value: state.projectReference ? state.projectReference.label : '',
        items: existingProjects.map(project => {
          return {
            label: project.substring(project.lastIndexOf(path.sep) + 1),
            description: project,
            path: project
          };
        })
      });
    }
  };

  const stepTestProjectName: InputStep<NewTestProjectState> = async (
    input: MultiStepInput<NewTestProjectState>,
    state: NewTestProjectState
  ) => {
    if (state.projectName === undefined) {
      if (state.projectReference !== undefined) {
        const suggestedTestProjectName = `${state.projectReference.label}Test`;
        if (validateTestProjectNameSyntax(suggestedTestProjectName) === undefined) {
          state.projectName = suggestedTestProjectName;
        }
      } else {
        state.projectName = '';
      }
    }
    state.projectName = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: l10n.t('Choose test project name'),
      placeholder: l10n.t('Enter a test project name. Allowed characters: a-z, A-Z, 0-9, _, -'),
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.projectName,
      validationFunction: validateTestProjectName,
      onBack: (typedValue: string) => {
        state.projectName = typedValue;
      }
    });
    const referenceProject = state.projectReference;
    if (!referenceProject) {
      throw new MultiStepInvalidStateError(l10n.t('No reference project selected.'));
    }
    state.projectPath = path.join(path.dirname(referenceProject.path), state.projectName);
  };

  const stepGroupId: InputStep<NewTestProjectState> = async (input: MultiStepInput<NewTestProjectState>, state: NewTestProjectState) => {
    if (state.groupId === undefined) {
      if (state.projectName !== undefined) {
        const sanitizedTestProjectName = state.projectName.replace(/-/g, '.');
        if (validateDotSeparatedName(sanitizedTestProjectName, 'Group ID') === undefined) {
          state.groupId = sanitizedTestProjectName;
        }
      } else {
        state.groupId = '';
      }
    }
    state.groupId = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: l10n.t('Choose a Group ID'),
      placeholder: l10n.t('Enter a Group ID (e.g. com.domain.one). Allowed characters: a-z, A-Z, 0-9, _'),
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.groupId,
      validationFunction: (value: string) => validateDotSeparatedName(value, 'Group ID'),
      onBack: (typedValue: string) => {
        state.groupId = typedValue;
      }
    });
  };

  const stepTestProjectId: InputStep<NewTestProjectState> = async (
    input: MultiStepInput<NewTestProjectState>,
    state: NewTestProjectState
  ) => {
    if (state.projectId === undefined) {
      if (state.projectName !== undefined) {
        const sanitizedTestProjectName = state.projectName.replace(/-/g, '.');
        if (validateProjectArtifactId(sanitizedTestProjectName) === undefined) {
          state.projectId = sanitizedTestProjectName;
        }
      } else {
        state.projectId = '';
      }
    }
    state.projectId = await input.showTextInput({
      title: state.dialogTitle,
      titleSuffix: l10n.t('Choose an Artifact ID'),
      placeholder: l10n.t('Enter an Artifact ID (e.g. another-project-id). Allowed characters: a-z, A-Z, 0-9, _'),
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      value: state.projectId,
      validationFunction: (value: string) => validateProjectArtifactId(value),
      onBack: (typedValue: string) => {
        state.projectId = typedValue;
      }
    });
  };

  const stepTestSelection: InputStep<NewTestProjectState> = async (
    input: MultiStepInput<NewTestProjectState>,
    state: NewTestProjectState
  ) => {
    while (true) {
      state.testSelections = await input.showQuickPick<QuickPickItem, true>({
        title: state.dialogTitle,
        titleSuffix: l10n.t('Choose test types'),
        placeholder: l10n.t('Select one or more of the available test types'),
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
        canSelectMany: true,
        selectedItems: state.testSelections,
        items: testTemplates.map(({ selection, detail }) => ({ label: selection, detail: detail })),
        onBack: (_filterText, selectedItems) => {
          state.testSelections = selectedItems;
        }
      });
      const warning = getWebTestWarning(state.testSelections);
      if (!warning || (await confirmWarning(warning))) {
        return;
      }
    }
  };

  const existingDeployedProjects = (await IvyEngineManager.instance.projects()) ?? [];

  const steps: InputStep<NewTestProjectState>[] = [stepProject, stepTestProjectName, stepGroupId, stepTestProjectId, stepTestSelection];
  const newTestProjectData: NewTestProjectState = {
    dialogTitle: l10n.t('New Axon Ivy Test Project'),
    currentStep: 1,
    totalSteps: steps.length,
    projectFromSelection: projectFromSelection
  };

  try {
    await new MultiStepInput<NewTestProjectState>().stepThrough(steps, newTestProjectData);
  } catch (err) {
    if (err instanceof MultiStepCancelledError) {
      if (err.message.trim()) {
        logErrorMessage(err.message);
      }
      return;
    } else {
      throw err;
    }
  }

  const referenceProject = newTestProjectData.projectReference;
  if (
    newTestProjectData.projectName !== undefined &&
    newTestProjectData.groupId !== undefined &&
    newTestProjectData.projectId !== undefined &&
    newTestProjectData.projectPath !== undefined &&
    referenceProject?.path !== undefined
  ) {
    const createTestProjectInput: CreateProjectParams = {
      name: newTestProjectData.projectName,
      groupId: newTestProjectData.groupId,
      projectId: newTestProjectData.projectId,
      path: newTestProjectData.projectPath
    };
    const testProject = await IvyEngineManager.instance.createTestProject(createTestProjectInput);
    if (!testProject) {
      throw new Error(`Test project could not be created: ${newTestProjectData.projectPath}`);
    }
    await addMavenProjectDependencyByPath(newTestProjectData.projectPath, referenceProject.path);

    if (newTestProjectData.testSelections?.some(item => item.label === 'IvyProcessTest')) {
      await IvyEngineManager.instance.createProcess({
        name: processName,
        kind: 'Business Process',
        path: newTestProjectData.projectPath,
        namespace: await resolveDefaultNamespace(newTestProjectData.projectPath, 'process')
      });
    }

    await configureTestProject(testProject, newTestProjectData.testSelections ?? [], extensionUri);
    await runJavaProjectImport();
  } else {
    throw new MultiStepInvalidStateError(
      'Test Project creation failed due to corrupted input state. Current input state: ' + JSON.stringify(newTestProjectData)
    );
  }
};
