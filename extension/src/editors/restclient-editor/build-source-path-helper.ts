import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import * as vscode from 'vscode';

const BUILD_HELPER_GROUP_ID = 'org.codehaus.mojo';
const BUILD_HELPER_ARTIFACT_ID = 'build-helper-maven-plugin';
const ADD_GENERATED_SOURCE_EXECUTION_ID = 'add-generated-source';
const PROJECT_BASEDIR = '${project.basedir}';

type MaybeArray<T> = T | T[] | undefined;

interface PomDocument {
  project?: PomProject;
}

interface PomProject {
  build?: PomBuild;
}

interface PomBuild {
  plugins?: PomPlugins;
}

interface PomPlugins {
  plugin?: PomPlugin | PomPlugin[];
}

interface PomPlugin {
  groupId?: string;
  artifactId?: string;
  executions?: PomExecutions;
}

interface PomExecutions {
  execution?: PomExecution | PomExecution[];
}

interface PomExecution {
  id: string;
  phase: string;
  goals: { goal: string | string[] };
  configuration: {
    sources: {
      source: string | string[];
    };
  };
}

const asArray = <T>(value: MaybeArray<T>): T[] => {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

export class BuildSourcePathHelper {
  private readonly parser = new XMLParser({
    ignoreAttributes: false
  });

  private readonly builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    indentBy: '  '
  });

  async ensureGeneratedSourcePath(projectPath: string, clientName: string): Promise<boolean> {
    const pomUri = vscode.Uri.joinPath(vscode.Uri.file(projectPath), 'pom.xml');
    const pomXml = new TextDecoder().decode(await vscode.workspace.fs.readFile(pomUri));
    const pom = this.parser.parse(pomXml) as PomDocument;
    if (!pom.project) {
      return false;
    }

    const sourcePath = `${PROJECT_BASEDIR}/src_generated/rest/${clientName}`;
    const project = pom.project;
    const build = (project.build ??= {});
    const pluginsContainer = (build.plugins ??= {});
    const plugins = asArray(pluginsContainer.plugin);

    const buildHelperPlugin = this.findOrCreateBuildHelperPlugin(plugins);
    if (this.hasSourcePath(buildHelperPlugin, sourcePath)) {
      return false;
    }

    this.addSourcePath(buildHelperPlugin, sourcePath);
    pluginsContainer.plugin = plugins;

    const updatedPomXml = this.builder.build(pom);
    await vscode.workspace.fs.writeFile(pomUri, new TextEncoder().encode(`${updatedPomXml}\n`));
    return true;
  }

  private findOrCreateBuildHelperPlugin(plugins: PomPlugin[]): PomPlugin {
    let plugin = plugins.find(p => p.groupId === BUILD_HELPER_GROUP_ID && p.artifactId === BUILD_HELPER_ARTIFACT_ID);
    if (plugin) {
      return plugin;
    }

    plugin = {
      groupId: BUILD_HELPER_GROUP_ID,
      artifactId: BUILD_HELPER_ARTIFACT_ID,
      executions: { execution: [] }
    };
    plugins.push(plugin);
    return plugin;
  }

  private hasSourcePath(plugin: PomPlugin, sourcePath: string): boolean {
    const executions = asArray(plugin.executions?.execution);
    const execution = executions.find(item => item.id === ADD_GENERATED_SOURCE_EXECUTION_ID);
    if (!execution) {
      return false;
    }
    return asArray(execution.configuration?.sources?.source).includes(sourcePath);
  }

  private addSourcePath(plugin: PomPlugin, sourcePath: string): void {
    const executionsContainer = (plugin.executions ??= {});
    const executions = asArray(executionsContainer.execution);
    let execution = executions.find(item => item.id === ADD_GENERATED_SOURCE_EXECUTION_ID);

    if (!execution) {
      execution = {
        id: ADD_GENERATED_SOURCE_EXECUTION_ID,
        phase: 'generate-sources',
        goals: { goal: 'add-source' },
        configuration: {
          sources: {
            source: []
          }
        }
      };
      executions.push(execution);
    }

    const sources = asArray(execution.configuration?.sources?.source);
    sources.push(sourcePath);
    execution.configuration = execution.configuration ?? { sources: { source: [] } };
    execution.configuration.sources = execution.configuration.sources ?? { source: [] };
    execution.configuration.sources.source = sources;

    execution.phase = 'generate-sources';
    execution.goals = { goal: 'add-source' };

    executionsContainer.execution = executions;
  }
}
