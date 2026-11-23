const IVY_IMPORT = 'import ch.ivyteam.ivy.environment.Ivy;';
const CASE_MAP_SERVICE_IMPORT = 'import ch.ivyteam.ivy.casemap.runtime.ICaseMapService;';

export const normalizeIvyCompletionLabel = (label: string) => {
  const normalized = label.trim().replace(/\s+/g, ' ').replace(/\s*\(.*$/, '');
  switch (normalized.toLowerCase()) {
    case 'wftask':
      return 'task';
    case 'wfcase':
      return 'case';
    default:
      return normalized;
  }
};

export const toJavaIvyContext = (code: string, position: { line: number; character: number }, imports: string[]) => {
  const usesIvy = /(?<![\w$.])ivy\s*\./.test(code);
  const usesCaseMap = /(?<![\w$.])ivy\s*\.\s*casemap\b/.test(code);
  const translatedImports = [...imports];
  if (usesCaseMap && !translatedImports.some(line => line.trim() === CASE_MAP_SERVICE_IMPORT)) {
    translatedImports.unshift(CASE_MAP_SERVICE_IMPORT);
  }
  if (usesIvy && !translatedImports.some(line => line.trim() === IVY_IMPORT)) {
    translatedImports.unshift(IVY_IMPORT);
  }

  const translate = (source: string, fullText = source) =>
    source.replace(/(?<![\w$.])ivy\s*\.\s*([A-Za-z_$][\w$]*)?/g, (match, attribute: string | undefined, offset: number) => {
      if (!attribute) {
        return 'Ivy.';
      }
      if (attribute === 'casemap') {
        return 'Ivy.get(ICaseMapService.class)';
      }
      const methodName = attribute === 'task' ? 'wfTask' : attribute === 'case' ? 'wfCase' : attribute;
      const suffix = fullText.slice(offset + match.length);
      return `Ivy.${methodName}${/^\s*\(/.test(suffix) ? '' : '()'}`;
    });

  const cursorOffset = Math.min(position.character, code.length);
  const translatedCode = translate(code);
  const translatedPosition = { line: position.line, character: translate(code.slice(0, cursorOffset), code).length };
  return { code: translatedCode, position: translatedPosition, imports: translatedImports };
};
