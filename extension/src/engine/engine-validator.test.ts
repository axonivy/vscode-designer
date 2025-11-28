import path from 'path';
import { expect, test } from 'vitest';
import { EngineValidator } from './engine-validator';

const extensionVersion = { major: 13, minor: 2, patch: 999, rawVersion: '13.2.999' };
const validator = new EngineValidator(extensionVersion);

const testDir = (engineDir: string) => path.join(__dirname, 'engine-validator-test', engineDir);

test('valid sample', async () => {
  expect(await validator.validate(testDir('engine'))).toEqual({
    valid: true,
    engineVersion: '13.2.10.123'
  });
});

test('wrong major', async () => {
  const customValidator = new EngineValidator({ major: 14, minor: 2, patch: 0, rawVersion: '14.2.0' });
  expect(await customValidator.validate(testDir('engine'))).toEqual({
    valid: false,
    reason: "Engine major version '13.2.10.123' does not match expected major version '14.2.0'."
  });
});

test('wrong minor', async () => {
  const customValidator = new EngineValidator({ major: 13, minor: 3, patch: 0, rawVersion: '13.3.0' });
  expect(await customValidator.validate(testDir('engine'))).toEqual({
    valid: false,
    reason: "Engine minor version '13.2.10.123' does not match expected minor version '13.3.0'."
  });
});

test('wrong patch', async () => {
  const customValidator = new EngineValidator(extensionVersion);
  customValidator.setMinPatchVersion(999);
  expect(await customValidator.validate(testDir('engine'))).toEqual({
    valid: false,
    reason: "Engine patch version '13.2.10.123' is older than expected version '13.2.999'."
  });
});

test('invalid when engine directory is undefined', async () => {
  expect(await validator.validate(undefined)).toEqual({ valid: false, reason: 'Provided engine directory is undefined' });
});

test('invalid when engine directory is does not exist', async () => {
  expect(await validator.validate('path/to/nowhere')).toEqual({
    valid: false,
    reason: "Provided engine path is not a directory 'path/to/nowhere'."
  });
});

test('invalid when util lib is missing', async () => {
  const result = await validator.validate(testDir('no-util-lib'));
  expect(result.valid).toBeFalsy();
});
