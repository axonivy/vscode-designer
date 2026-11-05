import { l10n } from 'vscode';

// Duplicated from core CommonFormats.java
export const PROJECT_NAME_MAX_LENGTH = 40;

export const sanitizeProjectName = (fileName: string) => {
  /**
   * Sanitize logic is duplicated from core ProjectService.java sanitizeProjectName
   * Must be kept in sync with that logic
   */
  const sanitized = fileName
    .replace(/\.iar/gi, '') // remove ALL .iar, also in the middle of the filename
    .replace(/\./g, '-')
    .replace(/[^\w-]/g, '_');
  return sanitized.slice(0, PROJECT_NAME_MAX_LENGTH);
};

export const explainSanitizedProjectName = () => {
  return l10n.t(
    'Project name is sanitized as follows:\n  All occurrences of ".iar" are removed.\n  Dots are replaced with hyphens.\n  Any character that is not a letter, digit, underscore, or hyphen is replaced with an underscore.\n  The resulting name is truncated to a maximum of {0} characters.\n  ',
    PROJECT_NAME_MAX_LENGTH
  );
};
