import path from 'path';
import { expect, test, vi } from 'vitest';
import { ReleaseTrainValidator } from './release-train-validator';

vi.mock('vscode', () => ({}));

const extensionVersion = { major: 13, minor: 2, patch: 999, rawVersion: '13.2.999', isPreview: true };
const validator = new ReleaseTrainValidator(extensionVersion);

const testDir = (engineDir: string) => path.join(__dirname, 'release-train-validator-test', engineDir);

test('valid sample', async () => {
  expect(await validator.validate(testDir('engine'))).toEqual({ valid: true, isDirectory: true });
});

test('wrong major', async () => {
  const customValidator = new ReleaseTrainValidator({ major: 14, minor: 2, patch: 0, isPreview: false });
  expect(await customValidator.validate(testDir('engine'))).toEqual({
    valid: false,
    isDirectory: true,
    reason: "Engine major version '13.2.10.123' does not match expected major version '14.2.0'."
  });
});

test('wrong minor', async () => {
  const customValidator = new ReleaseTrainValidator({ major: 13, minor: 3, patch: 0, isPreview: false });
  expect(await customValidator.validate(testDir('engine'))).toEqual({
    valid: false,
    isDirectory: true,
    reason: "Engine minor version '13.2.10.123' does not match expected minor version '13.3.0'."
  });
});

test('wrong patch', async () => {
  const customValidator = new ReleaseTrainValidator(extensionVersion);
  customValidator.setMinPatchVersion(999);
  expect(await customValidator.validate(testDir('engine'))).toEqual({
    valid: false,
    isDirectory: true,
    reason: "Engine patch version '13.2.10.123' is older than expected version '13.2.999'."
  });
});

test('invalid when engine directory is does not exist', async () => {
  expect(await validator.validate('path/to/nowhere')).toEqual({
    valid: false,
    reason: "Invalid release train tag or engine directory 'path/to/nowhere'"
  });
});

test('invalid when util lib is missing', async () => {
  const result = await validator.validate(testDir('no-util-lib'));
  expect(result.valid).toBeFalsy();
});

test('preview train', async () => {
  expect((await validator.validate('nightly-13.2')).valid).toBeTruthy();
  expect((await validator.validate('dev')).valid).toBeFalsy();
  expect((await validator.validate('nightly')).valid).toBeFalsy();
  expect((await validator.validate('sprint')).valid).toBeFalsy();

  expect(await validator.validate('Dev')).toEqual({
    valid: false,
    reason: "Invalid release train tag or engine directory 'Dev'"
  });
  expect((await validator.validate('13')).valid).toBeFalsy();
  expect((await validator.validate('13.2')).valid).toBeFalsy();
  expect((await validator.validate('13.2.0')).valid).toBeFalsy();
});

test('lts train', async () => {
  const customValidator = new ReleaseTrainValidator({ major: 14, minor: 0, patch: 10, isPreview: false });
  expect((await customValidator.validate('nightly-14.0')).valid).toBeTruthy();
  expect((await customValidator.validate('14.0')).valid).toBeTruthy();
  expect((await customValidator.validate('14.0.0')).valid).toBeTruthy();
  expect((await customValidator.validate('14.0.999')).valid).toBeTruthy();

  expect(await customValidator.validate('14.b')).toEqual({
    valid: false,
    reason: "Invalid release train tag or engine directory '14.b'"
  });
  expect((await customValidator.validate('14.0.0.')).valid).toBeFalsy();
  expect((await customValidator.validate('14')).valid).toBeFalsy();
  expect((await customValidator.validate('14.1')).valid).toBeFalsy();
  expect((await customValidator.validate('14.')).valid).toBeFalsy();
  expect((await customValidator.validate('nightly-14')).valid).toBeFalsy();
  expect((await customValidator.validate('dev')).valid).toBeFalsy();
  expect((await customValidator.validate('nightly')).valid).toBeFalsy();
  expect((await customValidator.validate('sprint')).valid).toBeFalsy();
  expect((await customValidator.validate('Dev')).valid).toBeFalsy();
  expect((await customValidator.validate('13')).valid).toBeFalsy();
  expect((await customValidator.validate('13.2')).valid).toBeFalsy();
});
