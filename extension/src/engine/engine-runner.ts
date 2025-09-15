import { ChildProcess, execFile } from 'child_process';
import Os from 'os';
import * as vscode from 'vscode';
import { downloadDevEngine } from '..';
import { config } from '../base/configurations';

export class EngineRunner {
  private childProcess?: ChildProcess;
  private _engineUrl?: string;
  private outputChannel = vscode.window.createOutputChannel('Axon Ivy Engine');

  constructor(private readonly embeddedEngineDirectory: vscode.Uri) {}

  public async start(): Promise<void> {
    this.outputChannel.show(true);
    this.childProcess = await this.launchEngineChildProcess();
    this.childProcess.on('error', (error: Error) => {
      this.outputChannel.append(error.message);
      throw error;
    });
    return new Promise<void>(resolve => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.childProcess?.stdout?.on('data', (data: any) => {
        const output = data.toString() as string;
        if (output && output.startsWith('Go to http')) {
          this._engineUrl = output.split('Go to ')[1]?.split(' to see')[0];
          resolve();
        }
        this.outputChannel.append(output);
      });
    });
  }

  private async launchEngineChildProcess(): Promise<ChildProcess> {
    const executable = Os.platform() === 'win32' ? 'AxonIvyEngineC.exe' : 'AxonIvyEngine';
    const engineDirectory = await this.engineDirectory();
    const engineLauncherScriptPath = vscode.Uri.joinPath(engineDirectory, 'bin', executable).fsPath;
    const env = {
      env: { ...process.env, JAVA_OPTS_IVY_SYSTEM: '-Ddev.mode=true -Divy.engine.testheadless=true' }
    };
    this.outputChannel.appendLine('Start ' + engineLauncherScriptPath);
    return execFile(engineLauncherScriptPath, env);
  }

  private async engineDirectory(): Promise<vscode.Uri> {
    const engineDirectory = config.engineDirectory();
    if (engineDirectory) {
      const engineDirUri = vscode.Uri.file(engineDirectory);
      if (await this.isDirectory(engineDirUri)) {
        return engineDirUri;
      }
    }
    if (await this.isDirectory(this.embeddedEngineDirectory)) {
      return this.embeddedEngineDirectory;
    }
    return await this.askForEngineDirectory();
  }

  private async isDirectory(uri: vscode.Uri) {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      return stat.type === vscode.FileType.Directory;
    } catch {
      return false;
    }
  }

  private async askForEngineDirectory(): Promise<vscode.Uri> {
    return vscode.window
      .showInformationMessage('There is no Axon Ivy Engine directory defined.', 'Select Engine Directory', 'Download Dev Engine')
      .then(async answer => {
        if (answer === 'Select Engine Directory') {
          await config.setEngineDirectory();
          return this.engineDirectory();
        }
        if (answer === 'Download Dev Engine') {
          if (await downloadDevEngine()) {
            return this.askForEngineDirectory();
          }
        }
        throw Error('No Axon Ivy Engine available.');
      });
  }

  public async stop() {
    if (!this.childProcess) {
      return;
    }
    console.log("Send 'shutdown' to Axon Ivy Engine");
    const shutdown = new Promise<void>(resolve => {
      this.childProcess?.on('exit', function (code: number) {
        console.log('Axon Ivy Engine has shutdown with exit code ' + code);
        resolve();
      });
    });
    if (Os.platform() === 'win32') {
      this.childProcess.stdin?.write('shutdown\n');
    } else {
      this.childProcess.kill('SIGINT');
    }
    console.log('Waiting for shutdown of Axon Ivy Engine');
    await shutdown;
    console.log('End waiting for Axon Ivy Engine shutdown');
  }

  public get engineUrl(): string {
    return this._engineUrl ?? '';
  }
}
