import {
  LanguageModelTextPart,
  LanguageModelToolResult,
  type LanguageModelTool,
  type LanguageModelToolInvocationOptions
} from 'vscode';
import { IvyEngineManager } from '../../engine/engine-manager';
import { markProjectsForInstall, parseAvailableProjectItems, parseProduct } from '../../market/utils/market-install-util';

type ImportMarketProductArgs = {
  productId: string;
  productJson: string;
};

const MAX_PRODUCT_JSON_SIZE = 256 * 1024;
const IMPORTABLE_PROJECTS: Readonly<Record<string, readonly string[]>> = {
  'connectivity-demo': ['com.axonivy.demo:connectivity-demos']
};

export async function importMarketProduct(input: unknown): Promise<string> {
  const args = parseArguments(input);
  const allowedProjects = IMPORTABLE_PROJECTS[args.productId];
  if (!allowedProjects) {
    throw new Error(`Market product '${args.productId}' is not allowed to import projects.`);
  }

  const selectedProjects = parseAvailableProjectItems(parseProduct(args.productJson)).filter(
    project => project.mavenType === 'maven-import' && allowedProjects.includes(`${project.groupId}:${project.artifactId}`)
  );
  if (selectedProjects.length === 0) {
    throw new Error(`Market product '${args.productId}' contains no allowlisted Maven import projects.`);
  }

  const productJson = markProjectsForInstall(args.productJson, selectedProjects);
  const engine = IvyEngineManager.instance;
  await engine.start();
  await engine.installMarketProduct({ productJson, dependentProjectPath: '' });
  return `Imported ${selectedProjects.map(project => `${project.groupId}:${project.artifactId}`).join(', ')} from '${args.productId}'.`;
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
    Object.keys(input).some(key => key !== 'productId' && key !== 'productJson') ||
    typeof input.productId !== 'string' ||
    typeof input.productJson !== 'string'
  ) {
    throw new Error('Expected only productId and productJson string arguments.');
  }
  if (Buffer.byteLength(input.productJson, 'utf8') > MAX_PRODUCT_JSON_SIZE) {
    throw new Error('productJson exceeds the 256 KiB limit.');
  }
  return { productId: input.productId, productJson: input.productJson };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === 'object' && !Array.isArray(input);
}