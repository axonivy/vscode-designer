import { exec } from 'child_process';
import { window } from 'vscode';

const outputChannel = window.createOutputChannel('Axon Ivy Codegen');

export async function runMavenCommand(ivyProjectDir: string, command: string) {
  const childProcess = exec(`${command} -Dstyle.color=never`, { cwd: ivyProjectDir });
  outputChannel.show(true);
  outputChannel.appendLine(`Running command: ${command}`);

  if (childProcess.stdout) {
    childProcess.stdout.setEncoding('utf-8');

    childProcess.stdout.on('data', (data: string) => {
      outputChannel.append(data);
    });
  }

  if (childProcess.stderr) {
    childProcess.stderr.setEncoding('utf-8');

    childProcess.stderr.on('data', (data: string) => {
      outputChannel.append(data);
    });
  }

  await new Promise<void>((resolve, reject) => {
    childProcess.on('error', (error: Error) => {
      outputChannel.appendLine(`Command failed to start: ${error.message}`);
      reject(error);
    });

    childProcess.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      const error = new Error(`Maven command failed with exit code ${code}${signal ? ` and signal ${signal}` : ''}.`);
      outputChannel.appendLine(error.message);
      reject(error);
    });
  });
}
