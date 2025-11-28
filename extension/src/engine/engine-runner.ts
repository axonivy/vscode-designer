import { ChildProcess, execFile } from 'child_process';
import Os from 'os';
import path from 'path';
import { outputChannel } from './output-channel';

export class EngineRunner {
  private childProcess?: ChildProcess;
  private _engineUrl?: string;

  constructor(private readonly engineDir: Promise<string | undefined>) {}

  public async start(): Promise<void> {
    outputChannel.show(true);
    this.childProcess = await this.launchEngineChildProcess();
    this.childProcess.on('error', (error: Error) => {
      outputChannel.append(error.message);
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
        outputChannel.append(output);
      });
    });
  }

  private async launchEngineChildProcess(): Promise<ChildProcess> {
    const executable = Os.platform() === 'win32' ? 'AxonIvyEngineC.exe' : 'AxonIvyEngine';
    const resolvedEngineDir = await this.engineDir;
    if (!resolvedEngineDir) {
      outputChannel.appendLine('Engine directory is undefined. Cannot start Axon Ivy Engine.');
      throw new Error('Engine directory is undefined');
    }
    const engineLauncherScriptPath = path.join(resolvedEngineDir, 'bin', executable);
    const env = {
      env: { ...process.env, JAVA_OPTS_IVY_SYSTEM: '-Ddev.mode=true -Divy.engine.testheadless=true' }
    };
    outputChannel.appendLine('Start ' + engineLauncherScriptPath);
    return execFile(engineLauncherScriptPath, env);
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
