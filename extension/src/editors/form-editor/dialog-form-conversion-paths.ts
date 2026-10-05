import path from 'path';

export type DialogFormConversionPaths = {
  sourceView: string;
  targetView: string;
};

export const getDialogFormConversionPaths = (projectDirectory: string, formPath: string): DialogFormConversionPaths | undefined => {
  const sourceDirectory = path.join(projectDirectory, 'dialog');
  const relativeFormPath = path.relative(sourceDirectory, formPath);
  if (
    relativeFormPath === '' ||
    relativeFormPath.startsWith(`..${path.sep}`) ||
    relativeFormPath === '..' ||
    path.isAbsolute(relativeFormPath) ||
    !path.basename(formPath).endsWith('.f.json')
  ) {
    return;
  }

  const sourceForm = formPath.slice(0, -'.f.json'.length);
  const relativeFormWithoutExtension = relativeFormPath.slice(0, -'.f.json'.length);
  return {
    sourceView: `${sourceForm}.xhtml`,
    targetView: path.join(projectDirectory, 'target', 'dialog', `${relativeFormWithoutExtension}.xhtml`)
  };
};
