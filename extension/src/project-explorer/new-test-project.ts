import path from 'path';
import { l10n, Range, Uri, workspace, WorkspaceEdit, type QuickPickItem } from 'vscode';
import { runJavaProjectImport } from '../base/java-extension-api';
import { logErrorMessage } from '../base/logging-util';
import type { CreateProjectParams } from '../engine/api/engine-api';
import type { ProjectBean } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { addMavenProjectDependencyByPath, addMavenTestDependency } from '../maven/add-dependency';
import type { AddCommandSelectionContext } from './ivy-project-explorer';
import {
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
  { selection: 'IvyTest', template: 'ivy-test.java.template', output: 'SampleIvyTest.java' },
  { selection: 'ProcessTest', template: 'process-test.java.template', output: 'SampleProcessTest.java' },
  { selection: 'WebIT', template: 'web-it.java.template', output: 'SampleWebIT.java' }
];

const configureTestProject = async (
  projectPath: string,
  groupId: string,
  referenceProject: ProjectBean,
  testSelections: QuickPickItem[],
  extensionUri: Uri
) => {
  const selected = new Set(testSelections.map(test => test.label));

  const needsUnitTester = selected.has('IvyTest') || selected.has('ProcessTest');
  const needsWebTester = selected.has('WebIT');

  if (needsUnitTester) {
    await addMavenTestDependency(projectPath, {
      groupId: 'com.axonivy.ivy.api.test',
      artifactId: 'ivy-test-api'
    });
  }

  if (needsWebTester) {
    await addMavenTestDependency(projectPath, {
      groupId: 'com.axonivy.ivy.api.test',
      artifactId: 'ivy-web-test-api'
    });
    await setMavenPackaging(projectPath);
  }

  for (const item of testTemplates) {
    if (!selected.has(item.selection)) {
      continue;
    }

    const toJavaPackage = (namespace: string) =>
      namespace
        .split('.')
        .map(part => part.replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1'))
        .join('.');

    const packageName = `${toJavaPackage(referenceProject.defaultNamespace)}.${item.selection === 'WebIT' ? 'webtest' : 'test'}`;
    const processPath = `${groupId.split('.').join('/')}/${processName}`;
    const templateUri = Uri.joinPath(extensionUri, 'assets', 'test-project-templates', item.template);
    const templateBytes = await workspace.fs.readFile(templateUri);
    const javaSource = new TextDecoder()
      .decode(templateBytes)
      .replace('{{packageName}}', packageName)
      .replace('{{ProcessForTest}}', processPath);
    const outputDir = Uri.joinPath(Uri.file(projectPath), 'src_test', ...packageName.split('.'));
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
        const suggestedTestProjectName = `test-${state.projectReference.label}`;
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
        const sanitizedTestProjectName = state.projectName?.replace(/-/g, '.');
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
        const sanitizedTestProjectName = state.projectName?.replace(/-/g, '.');
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
    state.testSelections = await input.showQuickPick<QuickPickItem, true>({
      title: state.dialogTitle,
      titleSuffix: l10n.t('Choose test types'),
      placeholder: l10n.t('Select one or more of the available test types'),
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      canSelectMany: true,
      selectedItems: state.testSelections,
      items: testTemplates.map(({ selection }) => ({ label: selection })),
      onBack: (_filterText, selectedItems) => {
        state.testSelections = selectedItems;
      }
    });
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
    const referenceBean = existingDeployedProjects.find(
      project => path.resolve(project.projectDirectory) === path.resolve(referenceProject.path)
    );
    if (!referenceBean) {
      throw new Error(`Reference project not found: ${referenceProject.path}`);
    }

    const createTestProjectInput: CreateProjectParams = {
      name: newTestProjectData.projectName,
      groupId: newTestProjectData.groupId,
      projectId: newTestProjectData.projectId,
      path: newTestProjectData.projectPath
    };
    await IvyEngineManager.instance.createTestProject(createTestProjectInput);
    await addMavenProjectDependencyByPath(newTestProjectData.projectPath, referenceProject.path);

    await configureTestProject(
      newTestProjectData.projectPath,
      newTestProjectData.groupId,
      referenceBean,
      newTestProjectData.testSelections ?? [],
      extensionUri
    );

    if (newTestProjectData.testSelections?.some(item => item.label === 'ProcessTest')) {
      await IvyEngineManager.instance.createProcess({
        name: processName,
        kind: 'Business Process',
        path: newTestProjectData.projectPath,
        namespace: await resolveDefaultNamespace(newTestProjectData.projectPath, 'process')
      });
    }
    await runJavaProjectImport();
  } else {
    throw new MultiStepInvalidStateError(
      'Test Project creation failed due to corrupted input state. Current input state: ' + JSON.stringify(newTestProjectData)
    );
  }
};
