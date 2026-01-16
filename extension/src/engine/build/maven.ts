import { exec } from 'child_process';
import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import { config } from '../../base/configurations';

export class MavenBuilder {
  private readonly outputChannel: vscode.OutputChannel;
  private readonly xmlParser = new XMLParser();
  private readonly excludePattern: string;
  constructor(readonly engineDir: Promise<string | undefined>) {
    this.outputChannel = vscode.window.createOutputChannel('Axon Ivy Maven');
    this.excludePattern = config.projectExcludePattern() ?? '';
  }

  async buildProject(ivyProjectDir: string) {
    const resolvedEngineDir = await this.engineDir;
    const childProcess = exec(this.buildCommand(resolvedEngineDir), { cwd: ivyProjectDir });
    this.outputChannel.show(true);
    childProcess.on('error', (error: Error) => {
      this.outputChannel.append(error.message);
      throw error;
    });
    if (childProcess.stdout) {
      childProcess.stdout.setEncoding('utf-8');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      childProcess.stdout.on('data', (data: any) => {
        this.outputChannel.append(data);
      });
    }
    await new Promise<void>(resolve => {
      childProcess.on('exit', () => {
        resolve();
      });
    });
  }

  private buildCommand(engineDir?: string) {
    const ivyEngineDirectory = engineDir ? `-Divy.engine.directory="${engineDir}" ` : '';
    return `mvn package --batch-mode -Divy.script.validation.skip=true -Dmaven.test.skip=true ${ivyEngineDirectory}-Dstyle.color=never`;
  }

  async buildProjects() {
    const poms = (await vscode.workspace.findFiles('**/pom.xml', this.excludePattern)).map(uri => uri.fsPath);
    const moduleProjects = poms.filter(pom => this.containModuels(pom)).map(pom => path.dirname(pom));
    const projectsToBuild = poms.map(pom => path.dirname(pom)).filter(project => !this.isUnderModuleProject(project, moduleProjects));
    for (const project of projectsToBuild) {
      await this.buildProject(project);
    }
  }

  private containModuels(path: string): boolean {
    const contents = fs.readFileSync(path, 'utf-8');
    const pom = this.xmlParser.parse(contents);
    return pom.project && pom.project.modules;
  }

  private isUnderModuleProject(project: string, moduleProjects: string[]): string | undefined {
    return moduleProjects.find(moduleProject => project.startsWith(moduleProject + path.sep) && project !== moduleProject);
  }
}
