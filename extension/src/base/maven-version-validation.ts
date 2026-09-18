import { execFileSync } from 'child_process';
import { accessSync, constants, statSync } from 'fs';
import { workspace } from 'vscode';
import { logInformationMessage } from './logging-util';

const DEFAULT_MAVEN_EXECUTABLE = 'mvn';
const MAVEN_SETTING_GROUP = 'maven';
const MAVEN_SETTING_EXECUTABLE_PATH = 'executable.path';
const MAVEN_SETTING_KEY = `${MAVEN_SETTING_GROUP}.${MAVEN_SETTING_EXECUTABLE_PATH}`;
const EXPECTED_MAVEN_VERSION = '3.9';

export const validateMavenExecutable = () => {
  const { ws: mvnExecOverrideWorkspace, user: mvnExecOverrideUser } = getMvnExecutables();

  const candidateExec = mvnExecOverrideWorkspace ?? mvnExecOverrideUser ?? DEFAULT_MAVEN_EXECUTABLE;

  const isValid = checkMvnExecutable(candidateExec);

  if (isValid) {
    if (mvnExecOverrideWorkspace) {
      logInformationMessage(
        `Found valid Workspace Maven executable setting "${MAVEN_SETTING_KEY}" = ${mvnExecOverrideWorkspace}.
        This Maven executable will be used.`
      );
    } else if (mvnExecOverrideUser) {
      logInformationMessage(
        `Found valid User Maven executable setting "${MAVEN_SETTING_KEY}" = ${mvnExecOverrideUser}.
        This Maven executable will be used.`
      );
    }
    return;
  }

  if (mvnExecOverrideWorkspace) {
    throw new Error(`Invalid Workspace Maven executable setting "${MAVEN_SETTING_KEY}": ${mvnExecOverrideWorkspace}.
    This is not a valid Maven executable with version ${EXPECTED_MAVEN_VERSION}. 
    Remove the setting from your Workspace configuration.`);
  }
  if (mvnExecOverrideUser) {
    throw new Error(`Invalid User Maven executable setting "${MAVEN_SETTING_KEY}": ${mvnExecOverrideUser}.
    This is not a valid Maven executable with version ${EXPECTED_MAVEN_VERSION}. 
    Remove the setting from your User configuration.`);
  }

  throw new Error(`No valid Maven executable found.
  Please ensure Maven ${EXPECTED_MAVEN_VERSION} is installed and accessible in your PATH
  or the path to the executable is configured in your VS Code settings via "${MAVEN_SETTING_KEY}."`);
};

const getMvnExecutables = () => {
  const mvnConfig = workspace.getConfiguration(MAVEN_SETTING_GROUP);
  if (!mvnConfig) {
    return {
      ws: undefined,
      user: undefined
    };
  }
  const mvnOverrideWorkspace = mvnConfig.inspect<string>(MAVEN_SETTING_EXECUTABLE_PATH)?.workspaceValue;
  const mvnOverrideUser = mvnConfig.inspect<string>(MAVEN_SETTING_EXECUTABLE_PATH)?.globalValue;
  return {
    ws: mvnOverrideWorkspace,
    user: mvnOverrideUser
  };
};

const checkMvnExecutable = (pathToExecutable: string) => {
  if (pathToExecutable && pathToExecutable != DEFAULT_MAVEN_EXECUTABLE) {
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
  } catch (e) {
    console.error(e);
    return false;
  }
};

const isExpectedMavenVersion = (versionOutput: string) => {
  return new RegExp(`Apache Maven ${EXPECTED_MAVEN_VERSION.replace('.', '\\.')}\\.\\d+(?:\\s|$)`).test(versionOutput);
};
