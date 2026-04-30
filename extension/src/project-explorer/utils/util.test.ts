import { expect, test, vi } from 'vitest';
import { validateDotSeparatedName, validateNamespace, validateProjectArtifactName, validateProjectName } from './util';

vi.mock('vscode', () => ({
  FileType: { File: 1, Directory: 2 },
  Uri: { joinPath: vi.fn(), file: vi.fn() },
  workspace: { fs: { readFile: vi.fn(), stat: vi.fn() } }
}));

test.describe('validateDotSeparatedName', () => {
  test('valid single character', () => {
    expect(validateDotSeparatedName('a')).toBeUndefined();
    expect(validateDotSeparatedName('_')).toBeUndefined();
  });

  test('valid single word', () => {
    expect(validateDotSeparatedName('ab')).toBeUndefined();
  });

  test('valid dotseparated words single character', () => {
    expect(validateDotSeparatedName('a.b')).toBeUndefined();
    expect(validateDotSeparatedName('a.b.c')).toBeUndefined();
    expect(validateDotSeparatedName('aa.bb.cc')).toBeUndefined();
    expect(validateDotSeparatedName('aa.b')).toBeUndefined();
    expect(validateDotSeparatedName('a.bb')).toBeUndefined();
    expect(validateDotSeparatedName('aa.bb')).toBeUndefined();
  });

  test('valid dotseparated words digits underscores', () => {
    expect(validateDotSeparatedName('a1.b')).toBeUndefined();
    expect(validateDotSeparatedName('a.b2')).toBeUndefined();
    expect(validateDotSeparatedName('a1.b2')).toBeUndefined();

    expect(validateDotSeparatedName('a_.b')).toBeUndefined();
    expect(validateDotSeparatedName('a.b_')).toBeUndefined();
    expect(validateDotSeparatedName('a_.b_')).toBeUndefined();
    expect(validateDotSeparatedName('_a.b')).toBeUndefined();
    expect(validateDotSeparatedName('_a._b')).toBeUndefined();
    expect(validateDotSeparatedName('_a_._b_')).toBeUndefined();

    expect(validateDotSeparatedName('_._')).toBeUndefined();
  });

  test('error invalid characters', () => {
    expect(validateDotSeparatedName('')).toBeTruthy();
    expect(validateDotSeparatedName('-')).toBeTruthy();
    expect(validateDotSeparatedName('a-')).toBeTruthy();
    expect(validateDotSeparatedName('-a')).toBeTruthy();
    expect(validateDotSeparatedName('-a-')).toBeTruthy();
    expect(validateDotSeparatedName('a-a')).toBeTruthy();
    expect(validateDotSeparatedName('aa.b-b')).toBeTruthy();
    expect(validateDotSeparatedName('a/b')).toBeTruthy();
  });

  test('error malformed dots', () => {
    expect(validateDotSeparatedName('a.b.')).toBeTruthy();
    expect(validateDotSeparatedName('.a.b')).toBeTruthy();
    expect(validateDotSeparatedName('a..b')).toBeTruthy();
  });

  test('error whitespace', () => {
    expect(validateDotSeparatedName(' a')).toBeTruthy();
    expect(validateDotSeparatedName('a ')).toBeTruthy();
    expect(validateDotSeparatedName('a a')).toBeTruthy();
    expect(validateDotSeparatedName('aa.a a')).toBeTruthy();
    expect(validateDotSeparatedName('a a.aa')).toBeTruthy();
    expect(validateDotSeparatedName('a a.a a')).toBeTruthy();
    expect(validateDotSeparatedName('aa . aa')).toBeTruthy();
  });

  test('error leading digit', () => {
    expect(validateDotSeparatedName('1')).toBeTruthy();
    expect(validateDotSeparatedName('1a')).toBeTruthy();
    expect(validateDotSeparatedName('1a.b')).toBeTruthy();
    expect(validateDotSeparatedName('a.1b')).toBeTruthy();
    expect(validateDotSeparatedName('1a.1b')).toBeTruthy();
  });
});

test.describe('validateNamespace', () => {
  test('valid single character', () => {
    expect(validateNamespace('')).toBeUndefined();
    expect(validateNamespace('a')).toBeUndefined();
    expect(validateNamespace('_')).toBeUndefined();
  });

  test('valid single word', () => {
    expect(validateNamespace('ab')).toBeUndefined();
  });

  test(' valid slashseparated words single character', () => {
    expect(validateNamespace('a/b')).toBeUndefined();
    expect(validateNamespace('a/b/c')).toBeUndefined();
    expect(validateNamespace('aa/bb/cc')).toBeUndefined();
    expect(validateNamespace('aa/b')).toBeUndefined();
    expect(validateNamespace('a/bb')).toBeUndefined();
    expect(validateNamespace('aa/bb')).toBeUndefined();
  });

  test('valid slashseparated words digits underscores', () => {
    expect(validateNamespace('a1/b')).toBeUndefined();
    expect(validateNamespace('1a/b')).toBeUndefined();
    expect(validateNamespace('a/b2')).toBeUndefined();
    expect(validateNamespace('a/2b')).toBeUndefined();
    expect(validateNamespace('a1/b2')).toBeUndefined();
    expect(validateNamespace('1a/2b')).toBeUndefined();
    expect(validateNamespace('a/123/b')).toBeUndefined();

    expect(validateNamespace('a_/b')).toBeUndefined();
    expect(validateNamespace('a/b_')).toBeUndefined();
    expect(validateNamespace('a_/b_')).toBeUndefined();
    expect(validateNamespace('_a/b')).toBeUndefined();
    expect(validateNamespace('_a/_b')).toBeUndefined();
    expect(validateNamespace('_a_/_b_')).toBeUndefined();
    expect(validateNamespace('a_a/bb/cc')).toBeUndefined();
    expect(validateNamespace('aa/bb/c_c')).toBeUndefined();
    expect(validateNamespace('aa/b_b/cc')).toBeUndefined();
    expect(validateNamespace('a_a/b_b/c_c')).toBeUndefined();

    expect(validateNamespace('_/_')).toBeUndefined();
  });

  test('valid whitespaces in word', () => {
    expect(validateNamespace('a b')).toBeUndefined();
    expect(validateNamespace('a a/b b')).toBeUndefined();
    expect(validateNamespace('aa/b b')).toBeUndefined();
    expect(validateNamespace('a a/b b')).toBeUndefined();
    expect(validateNamespace('aa/bb/c c')).toBeUndefined();
  });

  test('error invalid characters', () => {
    expect(validateNamespace('-')).toBeTruthy();
    expect(validateNamespace('.')).toBeTruthy();
    expect(validateNamespace('a-')).toBeTruthy();
    expect(validateNamespace('-a')).toBeTruthy();
    expect(validateNamespace('-a-')).toBeTruthy();
    expect(validateNamespace('a-a')).toBeTruthy();
    expect(validateNamespace('a.a')).toBeTruthy();
    expect(validateNamespace('aa/b-b')).toBeTruthy();
    expect(validateNamespace('a.a/b-b')).toBeTruthy();
  });

  test('error malformed slashes', () => {
    expect(validateNamespace('a/b/')).toBeTruthy();
    expect(validateNamespace('/a/b')).toBeTruthy();
    expect(validateNamespace('a//b')).toBeTruthy();
  });

  test('error whitespaces', () => {
    expect(validateNamespace(' a')).toBeTruthy();
    expect(validateNamespace('a ')).toBeTruthy();
    expect(validateNamespace('a /b')).toBeTruthy();
    expect(validateNamespace('a/ b')).toBeTruthy();
    expect(validateNamespace('a / b')).toBeTruthy();
  });
});

test.describe('validateProjectName', () => {
  test('valid single character', () => {
    expect(validateProjectName('a')).toBeUndefined();
    expect(validateProjectName('_')).toBeUndefined();
    expect(validateProjectName('-')).toBeUndefined();
  });

  test('valid single word', () => {
    expect(validateProjectName('ab')).toBeUndefined();
    expect(validateProjectName('11')).toBeUndefined();
    expect(validateProjectName('__')).toBeUndefined();
    expect(validateProjectName('--')).toBeUndefined();
    expect(validateProjectName('1ab')).toBeUndefined();
    expect(validateProjectName('ab1')).toBeUndefined();
    expect(validateProjectName('_1ab')).toBeUndefined();
    expect(validateProjectName('ab1_')).toBeUndefined();
    expect(validateProjectName('_ab1_')).toBeUndefined();
    expect(validateProjectName('-1ab')).toBeUndefined();
    expect(validateProjectName('ab1-')).toBeUndefined();
    expect(validateProjectName('-ab1-')).toBeUndefined();
    expect(validateProjectName('_-1ab')).toBeUndefined();
    expect(validateProjectName('ab1-_')).toBeUndefined();
    expect(validateProjectName('_-ab1-_')).toBeUndefined();
  });

  test('error invalid characters', () => {
    expect(validateProjectName('')).toBeTruthy();
    expect(validateProjectName(' ')).toBeTruthy();
    expect(validateProjectName('a ')).toBeTruthy();
    expect(validateProjectName(' a')).toBeTruthy();
    expect(validateProjectName('a a')).toBeTruthy();
    expect(validateProjectName('/')).toBeTruthy();
    expect(validateProjectName('a/a')).toBeTruthy();
    expect(validateProjectName('.')).toBeTruthy();
    expect(validateProjectName('a.a')).toBeTruthy();
  });
});

test.describe('validateProjectArtifactName', () => {
  test('valid single character', () => {
    expect(validateProjectArtifactName('a')).toBeUndefined();
    expect(validateProjectArtifactName('_')).toBeUndefined();
  });

  test('valid single word', () => {
    expect(validateProjectArtifactName('ab')).toBeUndefined();
    expect(validateProjectArtifactName('__')).toBeUndefined();
    expect(validateProjectArtifactName('ab1')).toBeUndefined();
    expect(validateProjectArtifactName('ab1_')).toBeUndefined();
    expect(validateProjectArtifactName('_1ab')).toBeUndefined();
    expect(validateProjectArtifactName('_ab1_')).toBeUndefined();
  });

  test('error invalid characters', () => {
    expect(validateProjectArtifactName('-')).toBeTruthy();
    expect(validateProjectArtifactName('a-')).toBeTruthy();
    expect(validateProjectArtifactName('-a')).toBeTruthy();
    expect(validateProjectArtifactName('-a-')).toBeTruthy();
    expect(validateProjectArtifactName('a-a')).toBeTruthy();
    expect(validateProjectArtifactName('aa/b-b')).toBeTruthy();
    expect(validateProjectArtifactName('a.b')).toBeTruthy();
  });

  test('error leading digit', () => {
    expect(validateProjectArtifactName('1')).toBeTruthy();
    expect(validateProjectArtifactName('1a')).toBeTruthy();
    expect(validateProjectArtifactName('1ab')).toBeTruthy();
  });

  test('error whitespace', () => {
    expect(validateProjectArtifactName(' ab')).toBeTruthy();
    expect(validateProjectArtifactName('ab ')).toBeTruthy();
    expect(validateProjectArtifactName('a b')).toBeTruthy();
  });
});
