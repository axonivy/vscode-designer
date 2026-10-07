import { Uri, type QuickPickItem } from 'vscode';
import { type MSStateBase, type ProjectSelection } from '../../project-explorer/utils/multi-step-input';

export interface ProductSelection extends QuickPickItem {
  id: string;
  label: string;
  description?: string;
  detail?: string;
  iconPath?: Uri;
}

export interface ProductProjectSelection extends QuickPickItem {
  label: string;
  description?: string;
  mavenType: 'maven-import' | 'maven-dependency';
  artifactId?: string;
  groupId?: string;
  isPicked: boolean;
  requireOneOfGroup?: string;
}

export interface InstallMarketProductState extends MSStateBase {
  product?: ProductSelection;
  installProductJson?: string;
  sourceProductJson?: string;
  version?: string;
  projects?: ProductProjectSelection[];
  projectsSearchString?: string;
  forceBackRequiredStep: boolean;
  changedProjectSelection: boolean;
  dependentProject?: ProjectSelection;
  dependentProjectFilterText?: string;
}

export const initState = (state: { dialogTitle: string; totalSteps: number; sourceProductJson?: string }): InstallMarketProductState => ({
  ...state,
  currentStep: 1,
  changedProjectSelection: false,
  forceBackRequiredStep: false
});

export const resetState = (state: InstallMarketProductState, keep: (keyof InstallMarketProductState)[] = []) => {
  const previousState = { ...state };

  Object.assign(state, {
    version: undefined,
    projects: undefined,
    projectsSearchString: undefined,
    changedProjectSelection: false,
    dependentProject: undefined,
    dependentProjectFilterText: undefined,
    forceBackRequiredStep: false
  });

  Object.assign(state, Object.fromEntries(keep.map(key => [key, previousState[key]])));
};
