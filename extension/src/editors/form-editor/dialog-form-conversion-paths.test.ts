import path from 'path';
import { describe, expect, test } from 'vitest';
import { getDialogFormConversionPaths } from './dialog-form-conversion-paths';

describe('getDialogFormConversionPaths', () => {
  const projectDirectory = path.join(path.sep, 'workspace', 'project');

  test('maps a dialog form to its generated and source XHTML paths', () => {
    const formPath = path.join(projectDirectory, 'dialog', 'ch', 'ivyteam', 'Example', 'Example.f.json');

    expect(getDialogFormConversionPaths(projectDirectory, formPath)).toEqual({
      sourceView: path.join(projectDirectory, 'dialog', 'ch', 'ivyteam', 'Example', 'Example.xhtml'),
      targetView: path.join(projectDirectory, 'target', 'dialog', 'ch', 'ivyteam', 'Example', 'Example.xhtml')
    });
  });

  test('rejects files outside dialog and non-form files', () => {
    expect(
      getDialogFormConversionPaths(projectDirectory, path.join(projectDirectory, 'src_hd', 'Example', 'Example.f.json'))
    ).toBeUndefined();
    expect(
      getDialogFormConversionPaths(projectDirectory, path.join(projectDirectory, 'dialog', 'Example', 'Example.xhtml'))
    ).toBeUndefined();
  });
});
