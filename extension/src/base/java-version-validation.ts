import fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import { logErrorMessage, logInformationMessage } from './logging-util';

const EXPECTED_JAVA_VERSION = '25';

export const validateAndSyncJavaVersion = async () => {
  let javaHome = process.env.IVY_JAVA_HOME ?? process.env.JAVA_HOME;
  const jdtJavaHome = vscode.workspace.getConfiguration().get<string>('java.jdt.ls.java.home');
  if (!javaHome && !jdtJavaHome) {
    const message = `No Java found.
    Either set env variable JAVA_HOME to valid Java ${EXPECTED_JAVA_VERSION} installation path,
    or configure VS Code setting 'java.jdt.ls.java.home'.`;
    logErrorMessage(message);
    throw new Error(message);
  }
  if (!javaHome && jdtJavaHome) {
    javaHome = jdtJavaHome;
    process.env.IVY_JAVA_HOME = javaHome; // will be used for engine start
  }
  if (!isValidJavaVersion(javaHome)) {
    const message = `Wrong Java version detected under ${javaHome}. Expected Java ${EXPECTED_JAVA_VERSION}.`;
    logErrorMessage(message);
    throw new Error(message);
  }
  if (jdtJavaHome === javaHome) {
    return;
  }
  if (!jdtJavaHome || !isValidJavaVersion(jdtJavaHome)) {
    logInformationMessage("Updating 'java.jdt.ls.java.home' to match JAVA_HOME and restarting extension host...");
    await vscode.workspace.getConfiguration().update('java.jdt.ls.java.home', javaHome, vscode.ConfigurationTarget.Global);
    await vscode.commands.executeCommand('workbench.action.reloadWindow');
  }
};

const isValidJavaVersion = (javaHome?: string) => {
  if (!javaHome) {
    return false;
  }
  const releasePath = path.join(javaHome, 'release');
  try {
    const releaseContent = fs.readFileSync(releasePath, 'utf8');
    const javaVersion = releaseContent.split('\n').find(line => line.startsWith('JAVA_VERSION='));
    return javaVersion?.startsWith(`JAVA_VERSION="${EXPECTED_JAVA_VERSION}.`);
  } catch {
    return false;
  }
};
