import { exec } from 'child_process';
import * as vscode from 'vscode';

export class MavenBuilder {
  private readonly outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Axon Ivy Codegen');
  }

  async buildProject(ivyProjectDir: string, command: string) {
    const childProcess = exec(`${command} -Dstyle.color=never`, { cwd: ivyProjectDir });
    this.outputChannel.show(true);
    this.outputChannel.appendLine(`Running command: ${command}`);

    if (childProcess.stdout) {
      childProcess.stdout.setEncoding('utf-8');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      childProcess.stdout.on('data', (data: any) => {
        this.outputChannel.append(data);
      });
    }

    if (childProcess.stderr) {
      childProcess.stderr.setEncoding('utf-8');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      childProcess.stderr.on('data', (data: any) => {
        this.outputChannel.append(data);
      });
    }

    await new Promise<void>((resolve, reject) => {
      childProcess.on('error', (error: Error) => {
        this.outputChannel.appendLine(`Command failed to start: ${error.message}`);
        reject(error);
      });

      childProcess.on('exit', (code, signal) => {
        if (code === 0) {
          resolve();
          return;
        }
        const error = new Error(`Maven command failed with exit code ${code}${signal ? ` and signal ${signal}` : ''}.`);
        this.outputChannel.appendLine(error.message);
        reject(error);
      });
    });
  }
}
