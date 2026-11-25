const IVY_IMPORT = 'import ch.ivyteam.ivy.environment.Ivy;';
const CASE_MAP_SERVICE_IMPORT = 'import ch.ivyteam.ivy.casemap.runtime.ICaseMapService;';

export const normalizeIvyCompletionLabel = (label: string) => {
  const normalized = label
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*\(.*$/, '');
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

  const lines = code.split(/\r\n|\n|\r/);
  const line = Math.min(position.line, lines.length - 1);
  const lineStarts = [...code.matchAll(/\r\n|\n|\r/g)].map(match => match.index + match[0].length);
  const cursorOffset = (line === 0 ? 0 : (lineStarts[line - 1] ?? 0)) + Math.min(position.character, (lines[line] ?? '').length);
  const translatedCode = translate(code);
  let translatedCharacter = translate(code.slice(0, cursorOffset), code).length;
  // A cursor inside an environment name must stay inside the translated Java identifier,
  // not land after the synthetic invocation (or in a partially translated name).
  for (const match of code.matchAll(/(?<![\w$.])ivy\s*\.\s*([A-Za-z_$][\w$]*)/g)) {
    const attribute = match[1] ?? '';
    const attributeStart = match.index + match[0].length - attribute.length;
    if (cursorOffset >= attributeStart && cursorOffset <= match.index + match[0].length) {
      const prefixLength = translate(code.slice(0, match.index), code).length;
      if (attribute === 'casemap') {
        translatedCharacter = prefixLength + 'Ivy.get('.length + Math.min(cursorOffset - attributeStart, 'ICaseMapService'.length - 1);
      } else {
        const method = attribute === 'task' ? 'wfTask' : attribute === 'case' ? 'wfCase' : attribute;
        const aliasOffset = method.length - attribute.length;
        translatedCharacter = prefixLength + 'Ivy.'.length + aliasOffset + cursorOffset - attributeStart;
      }
      break;
    }
  }
  const translatedPrefixLines = translatedCode.slice(0, translatedCharacter).split(/\r\n|\n|\r/);
  const translatedPosition = { line: translatedPrefixLines.length - 1, character: translatedPrefixLines.at(-1)?.length ?? 0 };
  return { code: translatedCode, position: translatedPosition, imports: translatedImports };
};
