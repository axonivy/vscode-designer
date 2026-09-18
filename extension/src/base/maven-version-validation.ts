import { execFileSync } from 'child_process';
import { accessSync, constants, statSync } from 'fs';
import { workspace } from 'vscode';
import { logInformationMessage } from './logging-util';

const DEFAULT_MAVEN_EXECUTABLE = 'mvn';
const MAVEN_SETTING_GROUP = 'maven';
const MAVEN_SETTING_EXECUTABLE_PATH = 'executable.path';
const MAVEN_SETTING_KEY = `${MAVEN_SETTING_GROUP}.${MAVEN_SETTING_EXECUTABLE_PATH}`;
const EXPECTED_MAVEN_VERSION = '3.9';

export type MvnSettingExecutable = {
  scope: 'workspace' | 'user';
  value: string;
};

export const validateMavenExecutable = () => {
  const mvnExecutables = getMvnExecutables();
  const mvnExectuablesWs = mvnExecutables.filter(mvnExecutable => mvnExecutable.scope === 'workspace');
  const mvnExectuablesUser = mvnExecutables.filter(mvnExecutable => mvnExecutable.scope === 'user')[0];

  mvnExectuablesWs.forEach(mvnExecutable => {
    if (!checkMvnExecutable(mvnExecutable.value)) {
      throw new Error(`Invalid ${mvnExecutable.scope} Maven setting "${MAVEN_SETTING_KEY}": "${mvnExecutable.value}". 
        This is not a valid Maven executable with version ${EXPECTED_MAVEN_VERSION}.
        Remove the setting and reload the window`);
    }
  });
  if (mvnExectuablesWs.length > 0) {
    logInformationMessage(`Found valid Workspace/Folder Maven executable setting(s) "${MAVEN_SETTING_KEY}".
    This executable will be used for Maven operations in the respective Workspace/Folder.`);
  }

  if (mvnExectuablesUser) {
    if (!checkMvnExecutable(mvnExectuablesUser.value)) {
      throw new Error(`Invalid ${mvnExectuablesUser.scope} Maven setting "${MAVEN_SETTING_KEY}": "${mvnExectuablesUser.value}".
        This is not a valid Maven executable with version ${EXPECTED_MAVEN_VERSION}.
        Remove the setting and reload the window`);
    }
  }

  if (mvnExectuablesUser) {
    logInformationMessage(`Found valid User Maven executable setting(s) "${MAVEN_SETTING_KEY}": "${mvnExectuablesUser.value}".
    This executable will be used for Maven operations in folders where no Workspace/Folder Maven executable is configured.`);
  }

  const isValidPath = checkMvnExecutable(DEFAULT_MAVEN_EXECUTABLE);
  if (!isValidPath) {
    throw new Error(`No valid Maven executable found.
    Please ensure Maven ${EXPECTED_MAVEN_VERSION} is installed and accessible in your PATH
    or the path to the executable is configured in your VS Code settings via "${MAVEN_SETTING_KEY}"`);
  }
};

const getMvnExecutables = () => {
  const mvnExecutables: MvnSettingExecutable[] = [];
  const wsFolders = workspace.workspaceFolders ?? [];

  // Retrieve Maven executable settings from each workspace folder, covers single and multi-root workspaces
  wsFolders.forEach(folder => {
    const mvnConfig = workspace.getConfiguration(MAVEN_SETTING_GROUP, folder.uri).inspect<string>(MAVEN_SETTING_EXECUTABLE_PATH);
    if (mvnConfig?.workspaceFolderValue) {
      mvnExecutables.push({ scope: 'workspace', value: mvnConfig.workspaceFolderValue });
    } else if (mvnConfig?.workspaceValue) {
      mvnExecutables.push({ scope: 'workspace', value: mvnConfig.workspaceValue });
    }
  });

  // Also retrieve the user config if present
  const userMvnConfig = workspace.getConfiguration(MAVEN_SETTING_GROUP).inspect<string>(MAVEN_SETTING_EXECUTABLE_PATH)?.globalValue;
  if (userMvnConfig) {
    mvnExecutables.push({ scope: 'user', value: userMvnConfig });
  }
  return mvnExecutables;
};

const checkMvnExecutable = (pathToExecutable: string) => {
  if (pathToExecutable !== DEFAULT_MAVEN_EXECUTABLE) {
    if (!isExecutableFile(pathToExecutable)) {
      return false;
    }
  }
  try {
    const version = execFileSync(pathToExecutable, ['--version'], { encoding: 'utf8', windowsHide: true });
    return isExpectedMavenVersion(version);
  } catch {
    return false;
  }
};

const isExecutableFile = (path: string): boolean => {
  try {
    return statSync(path).isFile() && accessSync(path, constants.X_OK) === undefined;
  } catch {
    return false;
  }
};

const isExpectedMavenVersion = (versionOutput: string) => {
  return new RegExp(`Apache Maven ${EXPECTED_MAVEN_VERSION.replace('.', '\\.')}\\.\\d+(?:\\s|$)`).test(versionOutput);
};
