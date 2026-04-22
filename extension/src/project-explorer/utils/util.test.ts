import { expect, test, vi } from 'vitest';
import { validateDotSeparatedName, validateNamespace, validateProjectArtifactName } from './util';

vi.mock('vscode', () => ({
  FileType: { File: 1, Directory: 2 },
  Uri: { joinPath: vi.fn(), file: vi.fn() },
  workspace: { fs: { readFile: vi.fn(), stat: vi.fn() } }
}));

test('dotseparated valid single word', () => {
  expect(validateDotSeparatedName('hello')).toBeUndefined();
});

test('dotseparated valid dot-separated words', () => {
  expect(validateDotSeparatedName('com.example.project')).toBeUndefined();
});

test('dotseparated valid words with numbers', () => {
  expect(validateDotSeparatedName('com.example2.v3')).toBeUndefined();
});

test('dotseparated valid words with underscores', () => {
  expect(validateDotSeparatedName('com.my_project.util')).toBeUndefined();
});

test('dotseparated valid words with numbers and underscores', () => {
  expect(validateDotSeparatedName('com.my_project2.util')).toBeUndefined();
});

test('dotseparated error empty string', () => {
  expect(validateDotSeparatedName('')).toBeTruthy();
});

test('dotseparated error trailing dot', () => {
  expect(validateDotSeparatedName('com.example.')).toBeTruthy();
});

test('dotseparated error leading dot', () => {
  expect(validateDotSeparatedName('.com.example')).toBeTruthy();
});

test('dotseparated error consecutive dots', () => {
  expect(validateDotSeparatedName('com..example')).toBeTruthy();
});

test('dotseparated error trailing whitespace', () => {
  expect(validateDotSeparatedName('com.example ')).toBeTruthy();
});

test('dotseparated error leading whitespace', () => {
  expect(validateDotSeparatedName(' com.example')).toBeTruthy();
});

test('dotseparated error hyphens', () => {
  expect(validateDotSeparatedName('com.my-project')).toBeTruthy();
});

test('dotseparated error slash-separated input', () => {
  expect(validateDotSeparatedName('com/example')).toBeTruthy();
});

test('namespace valid single word', () => {
  expect(validateNamespace('hello')).toBeUndefined();
});

test('namespace valid slash-separated words', () => {
  expect(validateNamespace('com/example/project')).toBeUndefined();
});

test('namespace valid words with numbers', () => {
  expect(validateNamespace('com/example2/v3')).toBeUndefined();
});

test('namespace valid words with underscores before last group', () => {
  expect(validateNamespace('com/my_project/util')).toBeUndefined();
});

test('namespace valid words with numbers and underscores before last group', () => {
  expect(validateNamespace('4super_2com/my_project2/util')).toBeUndefined();
});

test('namespace valid empty string', () => {
  expect(validateNamespace('')).toBeUndefined();
});

test('namespace error trailing slash', () => {
  expect(validateNamespace('com/example/')).toBeTruthy();
});

test('namespace error leading slash', () => {
  expect(validateNamespace('/com/example')).toBeTruthy();
});

test('namespace error consecutive slashes', () => {
  expect(validateNamespace('com//example')).toBeTruthy();
});

test('namespace error trailing whitespace', () => {
  expect(validateNamespace('com/example ')).toBeTruthy();
});

test('namespace error leading whitespace', () => {
  expect(validateNamespace(' com/example')).toBeTruthy();
});

test('namespace error hyphens', () => {
  expect(validateNamespace('com/my-project')).toBeTruthy();
});

test('namespace error dot-separated input', () => {
  expect(validateNamespace('com.example')).toBeTruthy();
});

test('project artifact name valid single letter', () => {
  expect(validateProjectArtifactName('a')).toBeUndefined();
});

test('project artifact name valid underscore', () => {
  expect(validateProjectArtifactName('_')).toBeUndefined();
});

test('project artifact name valid single uppercase letter', () => {
  expect(validateProjectArtifactName('A')).toBeUndefined();
});

test('project artifact name valid one word', () => {
  expect(validateProjectArtifactName('oneWord')).toBeUndefined();
});

test('project artifact name valid one word with underscore', () => {
  expect(validateProjectArtifactName('oneWord_underscore')).toBeUndefined();
});

test('project artifact name valid leading underscore', () => {
  expect(validateProjectArtifactName('_leadingUnderscore')).toBeUndefined();
});

test('project artifact name valid double leading underscore', () => {
  expect(validateProjectArtifactName('__doubleLeadingUnderscore')).toBeUndefined();
});

test('project artifact name valid trailing underscore', () => {
  expect(validateProjectArtifactName('trailingUnderscore_')).toBeUndefined();
});

test('project artifact name valid double trailing underscore', () => {
  expect(validateProjectArtifactName('doubleTrailingUnderscore__')).toBeUndefined();
});

test('project artifact name valid both underscore', () => {
  expect(validateProjectArtifactName('_bothUnderscore_')).toBeUndefined();
});

test('project artifact name valid both double underscore', () => {
  expect(validateProjectArtifactName('__bothDoubleUnderscore__')).toBeUndefined();
});

test('project artifact name valid multiple underscore', () => {
  expect(validateProjectArtifactName('_multiple__underscore_')).toBeUndefined();
});

test('project artifact name valid digit second place', () => {
  expect(validateProjectArtifactName('d1igitSecondPlace')).toBeUndefined();
});

test('project artifact name valid digit last place', () => {
  expect(validateProjectArtifactName('digitLastPlace9')).toBeUndefined();
});

test('project artifact name invalid empty', () => {
  expect(validateProjectArtifactName('')).toBeTruthy();
});

test('project artifact name invalid leading digit', () => {
  expect(validateProjectArtifactName('1leadingDigit')).toBeTruthy();
});

test('project artifact name invalid leading whitespace', () => {
  expect(validateProjectArtifactName(' leadingWhitespace')).toBeTruthy();
});

test('project artifact name invalid trailing whitespace', () => {
  expect(validateProjectArtifactName('trailingWhitespace ')).toBeTruthy();
});
