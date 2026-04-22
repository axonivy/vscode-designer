import { expect, test, vi } from 'vitest';
import { validateDotSeparatedName, validateNamespaceWithSpace, validateProjectArtifactName } from './util';

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

test('namespace valid empty string', () => {
  expect(validateNamespaceWithSpace('')).toBeUndefined();
});

test('namespace valid simple', () => {
  expect(validateNamespaceWithSpace('simple')).toBeUndefined();
});

test('namespace valid simple with slash', () => {
  expect(validateNamespaceWithSpace('simple/with/slash')).toBeUndefined();
});

test('namespace valid start digit', () => {
  expect(validateNamespaceWithSpace('1startDigit')).toBeUndefined();
});

test('namespace valid end digit', () => {
  expect(validateNamespaceWithSpace('endDigit9')).toBeUndefined();
});

test('namespace valid start digit with slash', () => {
  expect(validateNamespaceWithSpace('1startDigit/with/slash9')).toBeUndefined();
});

test('namespace valid with underscore', () => {
  expect(validateNamespaceWithSpace('with_underscore')).toBeUndefined();
});

test('namespace valid with underscore and slash', () => {
  expect(validateNamespaceWithSpace('with/underscore_and/slash')).toBeUndefined();
});

test('namespace valid leading underscore', () => {
  expect(validateNamespaceWithSpace('_leading_underscore/abc')).toBeUndefined();
});

test('namespace valid leading double underscore', () => {
  expect(validateNamespaceWithSpace('_leading_double_underscore/abc')).toBeUndefined();
});

test('namespace valid trailing underscore', () => {
  expect(validateNamespaceWithSpace('abc/trailing_underscore_')).toBeUndefined();
});

test('namespace valid trailing double underscore', () => {
  expect(validateNamespaceWithSpace('abc/trailing_double_underscore__')).toBeUndefined();
});

test('namespace valid with digits and underscores in slash groups', () => {
  expect(validateNamespaceWithSpace('with/8digit/underscore/_and/_slash')).toBeUndefined();
});

test('namespace valid with whitespace in words', () => {
  expect(validateNamespaceWithSpace('s imple with whitespac e')).toBeUndefined();
});

test('namespace valid with whitespace and slashes', () => {
  expect(validateNamespaceWithSpace('s imple with/whitespac e')).toBeUndefined();
});

test('namespace valid double whitespace', () => {
  expect(validateNamespaceWithSpace('d  ouble  whitespac  e')).toBeUndefined();
});

test('namespace invalid trailing slash', () => {
  expect(validateNamespaceWithSpace('trailing/slash/')).toBeTruthy();
});

test('namespace invalid leading slash', () => {
  expect(validateNamespaceWithSpace('/leading/slash')).toBeTruthy();
});

test('namespace invalid trailing whitespace', () => {
  expect(validateNamespaceWithSpace('trailing/whitespace ')).toBeTruthy();
});

test('namespace invalid leading whitespace', () => {
  expect(validateNamespaceWithSpace(' leading/whitespace')).toBeTruthy();
});

test('namespace invalid spaces around slash', () => {
  expect(validateNamespaceWithSpace('spaces /around / a  /  slash')).toBeTruthy();
});

test('namespace invalid empty slash group double slash', () => {
  expect(validateNamespaceWithSpace('emptySlash // group')).toBeTruthy();
});

test('namespace invalid empty slash group spaced single', () => {
  expect(validateNamespaceWithSpace('emptySlash / / group')).toBeTruthy();
});

test('namespace invalid empty slash group spaced double', () => {
  expect(validateNamespaceWithSpace('emptySlash /  / group')).toBeTruthy();
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
