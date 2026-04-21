import { beforeEach, expect, test, vi } from 'vitest';
import { workspace, type Uri } from 'vscode';
import { lineOfPid, pidOfLine } from './process-breakpoint-location-resolver';

vi.mock('vscode', () => ({
  workspace: {
    fs: {
      readFile: vi.fn()
    }
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('resolves lines for top-level, embedded, boundary, and deeply nested pids', async () => {
  vi.mocked(workspace.fs.readFile).mockResolvedValue(new TextEncoder().encode(processJsonFixture));

  const processUri = { fsPath: '/processes/test.p.json' } as Uri;

  await expect(lineOfPid(processUri, '184BD5B00AD6A83D-S20')).resolves.toBe(4);
  await expect(lineOfPid(processUri, '184BD5B00AD6A83D-S20-f5')).resolves.toBe(7);
  await expect(lineOfPid(processUri, '184BD5B00AD6A83D-S20-f2')).resolves.toBe(10);
  await expect(lineOfPid(processUri, '184BD5B00AD6A83D-S20-g1')).resolves.toBe(20);
  await expect(lineOfPid(processUri, '184BD5B00AD6A83D-f12')).resolves.toBe(27);
  await expect(lineOfPid(processUri, '184BD5B00AD6A83D-S30')).resolves.toBe(30);
  await expect(lineOfPid(processUri, '184BD5B00AD6A83D-S30-S31')).resolves.toBe(33);
  await expect(lineOfPid(processUri, '184BD5B00AD6A83D-S30-S31-f1')).resolves.toBe(36);
  await expect(lineOfPid(processUri, '184BD5B00AD6A83D-S30-S31-f2')).resolves.toBe(39);
  await expect(lineOfPid(processUri, '184BD5B00AD6A83D-f99')).resolves.toBe(51);

  await expect(pidOfLine(processUri, 4)).resolves.toBe('184BD5B00AD6A83D-S20');
  await expect(pidOfLine(processUri, 7)).resolves.toBe('184BD5B00AD6A83D-S20-f5');
  await expect(pidOfLine(processUri, 10)).resolves.toBe('184BD5B00AD6A83D-S20-f2');
  await expect(pidOfLine(processUri, 20)).resolves.toBe('184BD5B00AD6A83D-S20-g1');
  await expect(pidOfLine(processUri, 27)).resolves.toBe('184BD5B00AD6A83D-f12');
  await expect(pidOfLine(processUri, 30)).resolves.toBe('184BD5B00AD6A83D-S30');
  await expect(pidOfLine(processUri, 33)).resolves.toBe('184BD5B00AD6A83D-S30-S31');
  await expect(pidOfLine(processUri, 36)).resolves.toBe('184BD5B00AD6A83D-S30-S31-f1');
  await expect(pidOfLine(processUri, 39)).resolves.toBe('184BD5B00AD6A83D-S30-S31-f2');
  await expect(pidOfLine(processUri, 51)).resolves.toBe('184BD5B00AD6A83D-f99');

  await expect(lineOfPid(processUri, '184BD5B00AD6A83D-S20-f3')).resolves.toBeUndefined();
  await expect(lineOfPid(processUri, '184BD5B00AD6A83D-f2')).resolves.toBeUndefined();
  await expect(lineOfPid(processUri, '184BD5B00AD6A83D-S30-S31-c1')).resolves.toBeUndefined();
  await expect(lineOfPid(processUri, '184BD5B00AD6A83D-S30-c0')).resolves.toBeUndefined();
});

const processJsonFixture = `{
  "$schema" : "https://json-schema.axonivy.com/14.0-dev/project/process.json",
  "id" : "184BD5B00AD6A83D",
  "elements" : [ {
      "id" : "S20",
      "type" : "EmbeddedProcess",
      "elements" : [ {
          "id" : "S20-f5",
          "type" : "Database",
          "boundaries" : [ {
              "id" : "S20-f2",
              "type" : "ErrorBoundaryEvent",
              "connect" : [
                { "id" : "S20-f3", "to" : "S20-f8" }
              ]
            } ],
          "connect" : [
            { "id" : "S20-f25", "to" : "S20-f8" }
          ]
        }, {
          "id" : "S20-g1",
          "type" : "EmbeddedEnd"
        } ],
      "connect" : [
        { "id" : "f2", "to" : "f9" }
      ]
    }, {
      "id" : "f12",
      "type" : "Database"
    }, {
      "id" : "S30",
      "type" : "EmbeddedProcess",
      "elements" : [ {
          "id" : "S30-S31",
          "type" : "EmbeddedProcess",
          "elements" : [ {
              "id" : "S30-S31-f1",
              "type" : "Script",
              "boundaries" : [ {
                  "id" : "S30-S31-f2",
                  "type" : "ErrorBoundaryEvent",
                  "connect" : [
                    { "id" : "S30-S31-c1", "to" : "S30-S31-f3" }
                  ]
                } ]
            } ]
        } ],
      "connect" : [
        { "id" : "S30-c0", "to" : "f99" }
      ]
    }, {
      "id" : "f99",
      "type" : "TaskEnd"
    } ]
}`;
