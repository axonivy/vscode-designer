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
  return `Project name is sanitized as follows:
  All occurrences of ".iar" are removed.
  Dots are replaced with hyphens.
  Any character that is not a letter, digit, underscore, or hyphen is replaced with an underscore.
  The resulting name is truncated to a maximum of ${PROJECT_NAME_MAX_LENGTH} characters.
  `;
};
