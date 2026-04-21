import { beforeEach, expect, test, vi } from 'vitest';
import type { Uri } from 'vscode';
import { Location, Position, SourceBreakpoint, debug } from 'vscode';
import { promptToStartProcessDebuggingIfNeeded } from '../../debug/process-debug';
import { ProcessBreakpointHandler, breakpointSnapshot, remapBreakpoints } from './process-breakpoint-handler';
import { lineOfPid, pidOfLine } from './process-breakpoint-location-resolver';

vi.mock('@axonivy/process-editor-protocol', () => ({
  ShowBreakpointAction: {
    create: vi.fn()
  }
}));

vi.mock('./process-breakpoint-location-resolver', () => ({
  lineOfPid: vi.fn(),
  pidOfLine: vi.fn()
}));

vi.mock('../../debug/process-debug', () => ({
  promptToStartProcessDebuggingIfNeeded: vi.fn()
}));

let mockBreakpoints: unknown[] = [];

vi.mock('vscode', () => {
  class Position {
    constructor(
      public readonly line: number,
      public readonly character: number
    ) {}
  }

  class Location {
    public readonly range: { start: Position };

    constructor(
      public readonly uri: Uri,
      position: Position
    ) {
      this.range = { start: position };
    }
  }

  class SourceBreakpoint {
    constructor(
      public readonly location: Location,
      public readonly enabled = true,
      public readonly condition?: string,
      public readonly hitCondition?: string,
      public readonly logMessage?: string
    ) {}
  }

  return {
    Location,
    Position,
    SourceBreakpoint,
    debug: {
      get breakpoints() {
        return mockBreakpoints;
      },
      addBreakpoints: vi.fn(),
      removeBreakpoints: vi.fn(),
      onDidChangeBreakpoints: vi.fn()
    }
  };
});

beforeEach(() => {
  mockBreakpoints = [];
  vi.clearAllMocks();
});

test('creates a breakpoint snapshot for mapped process breakpoints only', async () => {
  const processUri = uri('file:///process.p.json');
  const otherUri = uri('file:///other.p.json');
  const mappedBreakpoint = new SourceBreakpoint(new Location(processUri, new Position(3, 0)), false, 'x > 1');
  const staleBreakpoint = new SourceBreakpoint(new Location(processUri, new Position(7, 0)));
  const foreignBreakpoint = new SourceBreakpoint(new Location(otherUri, new Position(3, 0)));

  mockBreakpoints = [mappedBreakpoint, staleBreakpoint, foreignBreakpoint, { location: { uri: processUri } }];

  vi.mocked(pidOfLine).mockImplementation(async (documentUri, line) => {
    if (documentUri === processUri && line === 3) {
      return 'process-3';
    }
    return undefined;
  });

  await expect(breakpointSnapshot(processUri)).resolves.toEqual([{ breakpoint: mappedBreakpoint, elementId: 'process-3' }]);
});

test('prompts to start process debugging when adding a breakpoint', async () => {
  const processUri = uri('file:///process.p.json');
  const client = { document: { uri: processUri } };
  const handler = new ProcessBreakpointHandler(() => client as never, emptyClientIds, vi.fn());

  vi.mocked(lineOfPid).mockResolvedValue(4);

  await handler.toggleBreakpoint('client-1', 'process-4');

  expect(debug.addBreakpoints).toHaveBeenCalledTimes(1);
  expect(promptToStartProcessDebuggingIfNeeded).toHaveBeenCalledTimes(1);
});

test('does not prompt when removing an existing breakpoint', async () => {
  const processUri = uri('file:///process.p.json');
  const client = { document: { uri: processUri } };
  const existingBreakpoint = new SourceBreakpoint(new Location(processUri, new Position(4, 0)));
  const handler = new ProcessBreakpointHandler(() => client as never, emptyClientIds, vi.fn());

  mockBreakpoints = [existingBreakpoint];
  vi.mocked(lineOfPid).mockResolvedValue(4);

  await handler.toggleBreakpoint('client-1', 'process-4');

  expect(debug.removeBreakpoints).toHaveBeenCalledWith([existingBreakpoint]);
  expect(promptToStartProcessDebuggingIfNeeded).not.toHaveBeenCalled();
});

test('remaps breakpoints to current lines and preserves breakpoint settings', async () => {
  const processUri = uri('file:///process.p.json');
  const firstBreakpoint = new SourceBreakpoint(new Location(processUri, new Position(2, 0)), false, 'x > 1', '3', 'trace');
  const secondBreakpoint = new SourceBreakpoint(new Location(processUri, new Position(8, 0)), true, 'y > 2');

  vi.mocked(lineOfPid).mockImplementation(async (_documentUri, elementId) => {
    if (elementId === 'process-3') {
      return 11;
    }
    return undefined;
  });

  await remapBreakpoints(processUri, [
    { breakpoint: firstBreakpoint, elementId: 'process-3' },
    { breakpoint: secondBreakpoint, elementId: 'missing' }
  ]);

  expect(debug.removeBreakpoints).toHaveBeenCalledWith([firstBreakpoint, secondBreakpoint]);
  expect(debug.addBreakpoints).toHaveBeenCalledTimes(1);

  const [remappedBreakpoint] = vi.mocked(debug.addBreakpoints).mock.calls[0] ?? [];
  expect(remappedBreakpoint).toHaveLength(1);
  expect(remappedBreakpoint?.[0]).toBeInstanceOf(SourceBreakpoint);
  expect(remappedBreakpoint?.[0]).toMatchObject({
    enabled: false,
    condition: 'x > 1',
    hitCondition: '3',
    logMessage: 'trace',
    location: {
      uri: processUri,
      range: {
        start: {
          line: 11,
          character: 0
        }
      }
    }
  });
});

test('does not replace breakpoints when no snapshot can be remapped', async () => {
  const processUri = uri('file:///process.p.json');
  const breakpoint = new SourceBreakpoint(new Location(processUri, new Position(2, 0)));

  vi.mocked(lineOfPid).mockResolvedValue(undefined);

  await remapBreakpoints(processUri, [{ breakpoint, elementId: 'missing' }]);

  expect(debug.removeBreakpoints).not.toHaveBeenCalled();
  expect(debug.addBreakpoints).not.toHaveBeenCalled();
});

function uri(value: string): Uri {
  return {
    toString: () => value
  } as Uri;
}

function* emptyClientIds(): IterableIterator<string> {
  yield* [];
}
