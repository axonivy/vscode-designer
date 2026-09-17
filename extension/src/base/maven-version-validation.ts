import { workspace } from 'vscode';
import { logInformationMessage } from './logging-util';

const MAVEN_SETTING_GROUP = 'maven';
const MAVEN_SETTING_EXECUTABLE_PATH = 'executable.path';
const EXPECTED_MAVEN_VERSION = '3.9';

export const validateAndSyncMavenVersion = async () => {
  const mvnExectuables = getMvnExecutables();

  const isValidMvnOverrideWorkspace = isValidMvnVersion(mvnExectuables.ws);

  if (isValidMvnOverrideWorkspace) {
    const msg = `Found valid Maven path override in Workspace settings.
    Set by "${MAVEN_SETTING_GROUP}.${MAVEN_SETTING_EXECUTABLE_PATH}" = ${mvnExectuables.ws}. 
    This Maven installation will be used.
    `;
    logInformationMessage(msg);
  }

  const isValidMvnOverrideUser = isValidMvnVersion(mvnExectuables.user);

  if (isValidMvnOverrideUser) {
    const msg = `Found valid Maven path override in User settings.
    Set by "${MAVEN_SETTING_GROUP}.${MAVEN_SETTING_EXECUTABLE_PATH}" = ${mvnExectuables.user}. 
    This Maven installation will be used.
    `;
    logInformationMessage(msg);
  }

  const isValidMvnPath = isValidMvnVersion(mvnExectuables.ws);

  if (isValidMvnPath) {
    const msg = `No Maven path overrides found in settings.
    Found valid Maven path in system PATH.
    `;
    logInformationMessage(msg);
  }
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

const checkPathToExecutable = (path: string) => {
  // TODO
  // 1 - Check if path is executable file
  // 2 - Check if '${path} --version' return maven version EXPECTED_MAVEN_VERSION

  return false;
};

const checkMvnFromPath = () => {
  // TODO
  // 1 - Run 'mvn --version' and check maven version EXPECTED_MAVEN_VERSION

  return false;
};

const isValidMvnVersion = (pathToExecutable: string | undefined): boolean => {
  if (pathToExecutable) {
    return checkPathToExecutable(pathToExecutable);
  } else {
    return checkMvnFromPath();
  }
};
