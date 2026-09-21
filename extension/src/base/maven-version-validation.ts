import { execFileSync } from 'child_process';
import { accessSync, constants, statSync } from 'fs';
import { workspace, type WorkspaceFolder } from 'vscode';
import { logInformationMessage, logWarningMessage } from './logging-util';

const DEFAULT_MAVEN_EXECUTABLE = 'mvn';
const MAVEN_SETTING_GROUP = 'maven';
const MAVEN_SETTING_EXECUTABLE_PATH = 'executable.path';
const MAVEN_SETTING_KEY = `${MAVEN_SETTING_GROUP}.${MAVEN_SETTING_EXECUTABLE_PATH}`;
const EXPECTED_MAVEN_VERSION = '3.9';

export type MvnSettingExecutable = {
  scope: 'workspace' | 'user';
  value: string;
  workspaceFolder?: WorkspaceFolder;
};

export const validateMavenExecutable = () => {
  const mvnExecutables = getMvnExecutables();
  const mvnExectuablesWs = mvnExecutables.filter(mvnExecutable => mvnExecutable.scope === 'workspace');
  const mvnExectuablesUser = mvnExecutables.find(mvnExecutable => mvnExecutable.scope === 'user');

  mvnExectuablesWs.forEach(mvnExecutable => {
    if (!checkMvnExecutable(mvnExecutable.value)) {
      logWarningMessage(`Invalid ${mvnExecutable.scope} Maven setting "${MAVEN_SETTING_KEY}": "${mvnExecutable.value}". 
        This is not a valid Maven executable with version ${EXPECTED_MAVEN_VERSION}.
        Keeping this setting might lead to unexpected behavior.`);
    }
  });
  if (mvnExectuablesWs.length > 0) {
    logInformationMessage(`Found valid Workspace/Folder Maven executable setting(s) "${MAVEN_SETTING_KEY}".
    This executable will be used for Maven operations in the respective Workspace/Folder.`);
  }

  if (mvnExectuablesUser) {
    if (!checkMvnExecutable(mvnExectuablesUser.value)) {
      logWarningMessage(`Invalid ${mvnExectuablesUser.scope} Maven setting "${MAVEN_SETTING_KEY}": "${mvnExectuablesUser.value}".
        This is not a valid Maven executable with version ${EXPECTED_MAVEN_VERSION}.
        Keeping this setting might lead to unexpected behavior.`);
    }
  }

  if (mvnExectuablesUser) {
    logInformationMessage(`Found valid User Maven executable setting(s) "${MAVEN_SETTING_KEY}": "${mvnExectuablesUser.value}".
    This executable will be used for Maven operations in folders where no Workspace/Folder Maven executable is configured.`);
  }

  const isValidPath = checkMvnExecutable(DEFAULT_MAVEN_EXECUTABLE);
  if (!isValidPath) {
    logWarningMessage(`No valid Maven executable found.
    Please ensure Maven ${EXPECTED_MAVEN_VERSION} is installed and accessible in your PATH
    or the path to the executable is configured in your VS Code settings via "${MAVEN_SETTING_KEY}".
    Ignoring this might lead to unexpected behavior.`);
  }
};

const getMvnExecutables = () => {
  const mvnExecutables: MvnSettingExecutable[] = [];
  const wsFolders = workspace.workspaceFolders ?? [];

  // Retrieve Maven executable settings from each workspace folder, covers single and multi-root workspaces
  wsFolders.forEach(folder => {
    const mvnConfig = workspace.getConfiguration(MAVEN_SETTING_GROUP, folder.uri).inspect<string>(MAVEN_SETTING_EXECUTABLE_PATH);
    if (!mvnConfig) {
      return;
    }
    // Skip if neither workspace folder nor workspace value is set
    const val = mvnConfig.workspaceFolderValue ?? mvnConfig.workspaceValue;
    if (!val) {
      return;
    }
    mvnExecutables.push({
      scope: 'workspace',
      value: val,
      workspaceFolder: folder
    });
  });

  // Also retrieve the global user config value if present
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
