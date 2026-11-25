import { TextDocument } from 'vscode-languageserver-textdocument';

export const macroScriptAtPosition = (macro: string, position: { line: number; character: number }) => {
  const document = TextDocument.create('macro', 'ivyMacro', 0, macro);
  const offset = document.offsetAt(position);
  let opening = macro.indexOf('<%=');
  while (opening !== -1) {
    const start = opening + 3;
    // A closing delimiter inside an IvyScript string or comment is not a macro boundary.
    const tokens = /"(?:\\[\s\S]|[^"\\])*(?:"|$)|'(?:\\[\s\S]|[^'\\])*(?:'|$)|\/\/[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)|%>/g;
    tokens.lastIndex = start;
    let end = macro.length;
    let closed = false;
    for (let token = tokens.exec(macro); token; token = tokens.exec(macro)) {
      if (token[0] === '%>') {
        end = token.index;
        closed = true;
        break;
      }
    }
    if (offset >= start && (offset < end || (!closed && offset === end))) {
      const code = macro.slice(start, end);
      return { code, position: TextDocument.create('expression', 'ivyScript', 0, code).positionAt(offset - start) };
    }
    opening = closed ? macro.indexOf('<%=', end + 2) : -1;
  }
  return undefined;
};
