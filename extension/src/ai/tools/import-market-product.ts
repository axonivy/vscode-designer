import {
  LanguageModelTextPart,
  LanguageModelToolResult,
  type LanguageModelTool,
  type LanguageModelToolInvocationOptions
} from 'vscode';
import { IvyEngineManager } from '../../engine/engine-manager';
import { markProjectsForInstall, parseAvailableProjectItems, parseProduct } from '../../market/utils/market-install-util';

type ImportMarketProductArgs = {
  productId: string[];
  productJson: string;
};

export async function importMarketProduct(input: unknown): Promise<string> {
  const args = parseArguments(input);
  const requestedArtifactIds = args.productId;
  const product = parseProduct(args.productJson);
  const availableProjects = parseAvailableProjectItems(product).filter(project => project.mavenType === 'maven-import');
  const unavailableArtifactIds = requestedArtifactIds.filter(
    requested => !availableProjects.some(project => project.artifactId === requested)
  );
  if (unavailableArtifactIds.length > 0) {
    throw new Error(`No Maven import project(s) found with artifactId(s): ${unavailableArtifactIds.join(', ')}.`);
  }
  const ambiguousArtifactIds = requestedArtifactIds.filter(
    requested => availableProjects.filter(project => project.artifactId === requested).length > 1
  );
  if (ambiguousArtifactIds.length > 0) {
    throw new Error(`Multiple Maven import projects have artifactId(s): ${ambiguousArtifactIds.join(', ')}.`);
  }
  const requestedArtifactIdSet = new Set(requestedArtifactIds);
  const selectedProjects = availableProjects.filter(project => project.artifactId !== undefined && requestedArtifactIdSet.has(project.artifactId));

  const productJson = markProjectsForInstall(product, selectedProjects);
  const engine = IvyEngineManager.instance;
  await engine.start();
  await engine.installMarketProduct({ productJson, dependentProjectPath: '' });
  return `Imported ${selectedProjects.map(project => `${project.groupId}:${project.artifactId}`).join(', ')}.`;
}

export class ImportMarketProductTool implements LanguageModelTool<ImportMarketProductArgs> {
  async invoke(options: LanguageModelToolInvocationOptions<ImportMarketProductArgs>): Promise<LanguageModelToolResult> {
    const message = await importMarketProduct(options.input);
    return new LanguageModelToolResult([new LanguageModelTextPart(message)]);
  }
}

function parseArguments(input: unknown): ImportMarketProductArgs {
  if (
    !isRecord(input) ||
    !Array.isArray(input.productId) ||
    input.productId.length === 0 ||
    !input.productId.every((id: unknown) => typeof id === 'string') ||
    typeof input.productJson !== 'string'
  ) {
    throw new Error('Expected a non-empty list of artifactIds and a productJson string.');
  }
  return { productId: input.productId as string[], productJson: input.productJson };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === 'object' && !Array.isArray(input);
}