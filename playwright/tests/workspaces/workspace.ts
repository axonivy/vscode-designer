import * as path from 'path';

export const prebuiltWorkspacePath = path.resolve(import.meta.dirname, './prebuiltProject');
export const noEngineWorkspacePath = path.resolve(import.meta.dirname, './noEngine');
export const noProjectWorkspacePath = path.resolve(import.meta.dirname, './noProject');
export const multiProjectWorkspacePath = path.resolve(import.meta.dirname, './multiProject');
export const empty = path.resolve(import.meta.dirname, './empty');
export const embeddedEngineWorkspace = path.resolve(import.meta.dirname, './embeddedEngine');
export const minimalProjectWorkspacePath = path.resolve(import.meta.dirname, './minimalProject');
export const outdatedProjectWorkspacePath = path.resolve(import.meta.dirname, './outdatedProject');
export const portalPerformanceWorkspacePath = path.resolve(import.meta.dirname, './portalPerformance');
export const multiRootWorkspacePath = path.resolve(import.meta.dirname, './multiProject/multiRootWorkspace.code-workspace');
export const screenshotProject = path.resolve(import.meta.dirname, './screenshotProject');
