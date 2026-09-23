import { exec } from 'child_process';
import { promisify } from 'node:util';
import { workspace, type WorkspaceFolder } from 'vscode';
import { logInformationMessage, logWarningMessage } from './logging-util';

const DEFAULT_MAVEN_EXECUTABLE = 'mvn';
const MAVEN_SETTING_GROUP = 'maven';
const MAVEN_SETTING_EXECUTABLE_PATH = 'executable.path';
export const MAVEN_SETTING_KEY = `${MAVEN_SETTING_GROUP}.${MAVEN_SETTING_EXECUTABLE_PATH}`;
const EXPECTED_MAVEN_VERSION = '3.9';

const execAsync = promisify(exec);

export type MvnSettingExecutable = {
  scope: 'workspace' | 'user';
  value: string;
  workspaceFolder?: WorkspaceFolder;
};

export const validateMavenExecutable = async () => {
  const mvnExecutables = getMvnExecutables();
  const mvnExectuableUser = mvnExecutables.find(mvnExecutable => mvnExecutable.scope === 'user');

  // First check all workspace-specific Maven executable settings
  for (const mvnExecutable of mvnExecutables.filter(mvnExecutable => mvnExecutable.scope === 'workspace')) {
    if (!(await checkMvnExecutable(mvnExecutable.value))) {
      logWarningMessage(`Invalid ${mvnExecutable.scope} Maven executable setting "${MAVEN_SETTING_KEY}": "${mvnExecutable.value}"
        in workspace folder "${mvnExecutable.workspaceFolder?.uri.fsPath}".
        This is not a valid Maven executable with version ${EXPECTED_MAVEN_VERSION}.
        Keeping this setting might lead to unexpected behavior.`);
    } else {
      logInformationMessage(`Found valid ${mvnExecutable.scope} Maven executable setting "${MAVEN_SETTING_KEY}": "${mvnExecutable.value}"
        in workspace folder "${mvnExecutable.workspaceFolder?.uri.fsPath}".
        This executable will be used for Maven operations in that workspace.`);
    }
  }

  // Next, check the user-specific Maven executable setting if present
  if (mvnExectuableUser) {
    if (!(await checkMvnExecutable(mvnExectuableUser.value))) {
      logWarningMessage(`Invalid ${mvnExectuableUser.scope} Maven executable setting "${MAVEN_SETTING_KEY}": "${mvnExectuableUser.value}".
        This is not a valid Maven executable with version ${EXPECTED_MAVEN_VERSION}.
        Keeping this setting might lead to unexpected behavior.`);
    } else {
      logInformationMessage(`Found valid global ${mvnExectuableUser.scope} Maven executable setting "${MAVEN_SETTING_KEY}": "${mvnExectuableUser.value}".
      This executable will be used for Maven operations in folders where no Workspace/Folder Maven executable is configured.`);
    }
    return; // Stop further validation if a user-specific Maven executable is found and checked, no matter the validation outcome
  }

  // If there is no user-specific Maven executable, fall back to the default Maven executable on PATH
  const isValidPath = await checkMvnExecutable(DEFAULT_MAVEN_EXECUTABLE);
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

const checkMvnExecutable = async (executable: string): Promise<boolean> => {
  try {
    const command = [`"${executable}"`, '--version'].join(' ');
    const { stdout, stderr } = await execAsync(command, { encoding: 'utf8', windowsHide: true });
    const version = `${stdout}${stderr}`;
    return isExpectedMavenVersion(version);
  } catch (error) {
    console.log(`"${executable}":`, error);
    return false;
  }
};

const isExpectedMavenVersion = (versionOutput: string) => {
  return new RegExp(`Apache Maven ${EXPECTED_MAVEN_VERSION.replace('.', '\\.')}\\.\\d+(?:\\s|$)`).test(versionOutput);
};
