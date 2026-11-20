export type JavaSourceContext = {
  code: string;
  character: number;
  imports: string[];
};

export const IVY_IMPORT = 'import ch.ivyteam.ivy.environment.Ivy;';
const CASE_MAP_SERVICE_IMPORT = 'import ch.ivyteam.ivy.casemap.runtime.ICaseMapService;';
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

export const toJavaEnvironmentCompletionLabel = (label: string) => IVY_MEMBERS[label] ?? label;
const JAVA_TO_IVY_MEMBERS = Object.fromEntries(Object.entries(IVY_MEMBERS).map(([ivyMember, javaMethod]) => [javaMethod, ivyMember]));
export const toIvyEnvironmentCompletionLabel = (label: string) => JAVA_TO_IVY_MEMBERS[label];
export const isIvyEnvironmentCompletionPrefix = (prefix: string) => /\bivy(?:\.[A-Za-z_$]*)*\.?$/.test(prefix);
export const isIvyEnvironmentRootCompletionPrefix = (prefix: string) => /\bivy\.[A-Za-z_$]*$/.test(prefix);

const withIvyImport = (imports: string[]) =>
  imports.some(statement => statement.trim() === IVY_IMPORT) ? imports : [...imports, IVY_IMPORT];

export const toJavaCompletionSourceContext = (code: string, character: number, imports: string[] = []): JavaSourceContext => {
  const openIvyMember = /\bivy\.[A-Za-z_$]*$/.exec(code);
  if (!openIvyMember || openIvyMember.index === undefined) {
    return toJavaSourceContext(code, character, imports);
  }
  const prefix = code.slice(0, openIvyMember.index);
  return { code: `${prefix}Ivy.`, character: prefix.length + 4, imports: withIvyImport(imports) };
};

const ivyMemberMapping = (member: string) => {
  if (member === 'casemap') {
    const selection = 'ICaseMapService';
    const replacement = `Ivy.get(${selection}.class)`;
    return {
      replacement,
      selectionStart: replacement.indexOf(selection),
      selectionLength: selection.length,
      imports: [IVY_IMPORT, CASE_MAP_SERVICE_IMPORT]
    };
  }
  const method = IVY_MEMBERS[member];
  if (!method) {
    return undefined;
  }
  const replacement = `Ivy.${method}()`;
  return {
    replacement,
    selectionStart: replacement.indexOf(method) + method.length - member.length,
    selectionLength: member.length,
    imports: [IVY_IMPORT]
  };
};

export const toJavaSourceContext = (code: string, character: number, imports: string[] = []): JavaSourceContext => {
  const trailingIvyRoot = /\bivy\.$/.exec(code);
  const matches = [...code.matchAll(/\bivy\.([A-Za-z_$][\w$]*)/g)].flatMap(match => {
    const member = match[1];
    const mapping = member ? ivyMemberMapping(member) : undefined;
    if (!member || !mapping || match.index === undefined) {
      return [];
    }
    return [{ start: match.index, end: match.index + match[0].length, member, ...mapping }];
  });

  if (matches.length === 0 && !trailingIvyRoot) {
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
        translatedCharacter =
          match.start + characterDelta + match.selectionStart + Math.min(memberCharacter, match.selectionLength - 1);
      }
    }
  }
  translatedCode += code.slice(originalEnd);
  if (trailingIvyRoot) {
    translatedCode = `${translatedCode.slice(0, -4)}Ivy.`;
  }

  const requiredImports = new Set(matches.flatMap(match => match.imports));
  if (trailingIvyRoot) {
    requiredImports.add(IVY_IMPORT);
  }
  const javaImports = [...imports];
  for (const statement of requiredImports) {
    if (!javaImports.some(existing => existing.trim() === statement)) {
      javaImports.push(statement);
    }
  }
  return { code: translatedCode, character: translatedCharacter, imports: javaImports };
};
