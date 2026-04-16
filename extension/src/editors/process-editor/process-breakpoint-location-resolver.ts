import { workspace, type Uri } from 'vscode';

type ResolvedProcessBreakpointLocations = {
  pidToLine: Map<string, number>;
  lineToPid: Map<number, string>;
};

type ProcessElement = {
  id?: string;
  elements?: ProcessElement[];
  boundaries?: ProcessElement[];
};

type ProcessModel = {
  id?: string;
  elements?: ProcessElement[];
};

export async function lineOfPid(uri: Uri, pid: string): Promise<number | undefined> {
  return (await resolve(uri)).pidToLine.get(pid);
}

export async function pidOfLine(uri: Uri, line: number): Promise<string | undefined> {
  return (await resolve(uri)).lineToPid.get(line);
}

async function resolve(uri: Uri): Promise<ResolvedProcessBreakpointLocations> {
  const processSource = new TextDecoder().decode(await workspace.fs.readFile(uri));
  return resolveProcessBreakpointLocations(processSource);
}

function resolveProcessBreakpointLocations(processSource: string): ResolvedProcessBreakpointLocations {
  const pidToLine = new Map<string, number>();
  const lineToPid = new Map<number, string>();

  const processModel = parseProcessModel(processSource);
  if (!processModel?.elements) {
    return { pidToLine, lineToPid };
  }

  const pids = collectBreakpointPids(processModel.id, processModel.elements);
  scanSourceForElementLines(processSource, pids, pidToLine, lineToPid);

  return { pidToLine, lineToPid };
}

function parseProcessModel(processSource: string): ProcessModel | undefined {
  try {
    return JSON.parse(processSource) as ProcessModel;
  } catch {
    return undefined;
  }
}

function collectBreakpointPids(processId: string | undefined, elements: ProcessElement[]): Set<string> {
  const pids = new Set<string>();
  for (const element of elements) {
    collectBreakpointPidsOfElement(processId, element, pids);
  }
  return pids;
}

function collectBreakpointPidsOfElement(processId: string | undefined, element: ProcessElement, pids: Set<string>) {
  if (element.id) {
    const pid = buildPid(processId, element.id);
    pids.add(pid);
    pids.add(element.id);
  }

  for (const nestedElement of element.elements ?? []) {
    collectBreakpointPidsOfElement(processId, nestedElement, pids);
  }

  for (const boundary of element.boundaries ?? []) {
    collectBreakpointPidsOfElement(processId, boundary, pids);
  }
}

function scanSourceForElementLines(
  processSource: string,
  pids: Set<string>,
  pidToLine: Map<string, number>,
  lineToPid: Map<number, string>
) {
  const idPattern = /"id"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let currentLine = 0;
  let lastIndex = 0;

  for (const match of processSource.matchAll(idPattern)) {
    const matchIndex = match.index;
    if (matchIndex === undefined) {
      continue;
    }

    currentLine += countNewlinesInRange(processSource, lastIndex, matchIndex);
    lastIndex = matchIndex;

    const elementId = JSON.parse(`"${match[1] ?? ''}"`) as string;
    const pid = toPid(pids, elementId);
    if (!pid || pidToLine.has(pid)) {
      continue;
    }

    pidToLine.set(pid, currentLine);
    lineToPid.set(currentLine, pid);
  }
}

function toPid(pids: Set<string>, elementId: string): string | undefined {
  if (pids.has(elementId)) {
    for (const pid of pids) {
      if (pid === elementId) {
        continue;
      }
      if (pid.endsWith(`-${elementId}`)) {
        return pid;
      }
    }
    return elementId;
  }
  return undefined;
}

function buildPid(processId: string | undefined, elementId: string): string {
  return processId ? `${processId}-${elementId}` : elementId;
}

function countNewlinesInRange(processSource: string, startIndex: number, endIndex: number): number {
  let line = 0;
  for (let index = startIndex; index < endIndex; index += 1) {
    if (processSource[index] === '\n') {
      line += 1;
    }
  }
  return line;
}
