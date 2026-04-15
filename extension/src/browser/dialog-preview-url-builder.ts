export const buildDialogPreviewUrl = (devContextPath: string, app: string, previewProject: string, previewDialogId: string) => {
  const baseContextPath = stripDevWorkflowUiSuffix(normalizeContextPath(devContextPath));
  const taskUrl = [baseContextPath, app, '1', 'preview', previewProject, previewDialogId].map(stripSlashes).filter(Boolean).join('/');

  return `${baseContextPath}/dev-workflow-ui/faces/frame.xhtml?taskUrl=${encodeTaskUrl(`/${taskUrl}`)}`;
};

const encodeTaskUrl = (value: string) => encodeURIComponent(value).replaceAll('%7E', '~');

const stripDevWorkflowUiSuffix = (value: string) => value.replace(/\/dev-workflow-ui\/?$/, '');

const normalizeContextPath = (value: string) => {
  try {
    return stripTrailingSlash(new URL(value).pathname);
  } catch {
    return stripTrailingSlash(ensureLeadingSlash(value));
  }
};

const ensureLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`);

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const stripSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');
