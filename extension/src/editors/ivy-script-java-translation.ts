export type JavaSourceContext = {
  code: string;
  character: number;
  imports: string[];
};

const IVY_IMPORT = 'import ch.ivyteam.ivy.environment.Ivy;';
const IVY_MEMBERS: Record<string, string> = {
  cal: 'cal',
  request: 'request',
  response: 'response',
  wf: 'wf',
  session: 'session',
  case: 'wfCase',
  task: 'wfTask',
  security: 'security',
  cms: 'cms',
  cm: 'cm',
  html: 'html',
  log: 'log',
  extensions: 'extensions',
  datacache: 'datacache',
  persistence: 'persistence',
  var: 'var',
  rest: 'rest',
  repo: 'repo'
};

export const toJavaSourceContext = (code: string, character: number, imports: string[] = []): JavaSourceContext => {
  const matches = [...code.matchAll(/\bivy\.([A-Za-z_$][\w$]*)/g)].flatMap(match => {
    const member = match[1];
    const method = member ? IVY_MEMBERS[member] : undefined;
    if (!member || !method || match.index === undefined) {
      return [];
    }
    return [{ start: match.index, end: match.index + match[0].length, member, method, replacement: `Ivy.${method}()` }];
  });

  if (matches.length === 0) {
    return { code, character, imports };
  }

  let translatedCode = '';
  let originalEnd = 0;
  let characterDelta = 0;
  let translatedCharacter = character;
  for (const match of matches) {
    translatedCode += code.slice(originalEnd, match.start);
    translatedCode += match.replacement;
    originalEnd = match.end;

    const delta = match.replacement.length - (match.end - match.start);
    if (character >= match.end) {
      characterDelta += delta;
      translatedCharacter = character + characterDelta;
    } else if (character >= match.start) {
      const relativeCharacter = character - match.start;
      if (relativeCharacter <= 3) {
        translatedCharacter = match.start + characterDelta + relativeCharacter;
      } else {
        const memberCharacter = relativeCharacter - 4;
        const methodPrefixLength = match.method.length - match.member.length;
        translatedCharacter = match.start + characterDelta + 4 + methodPrefixLength + Math.min(memberCharacter, match.method.length - 1);
      }
    }
  }
  translatedCode += code.slice(originalEnd);

  const javaImports = imports.some(statement => statement.trim() === IVY_IMPORT) ? imports : [...imports, IVY_IMPORT];
  return { code: translatedCode, character: translatedCharacter, imports: javaImports };
};
