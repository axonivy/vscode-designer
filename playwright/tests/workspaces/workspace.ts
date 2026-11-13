import * as path from 'path';

export const prebuiltWorkspacePath = path.resolve(import.meta.dirname, './prebuiltProject');
export const multiProjectWorkspacePath = path.resolve(import.meta.dirname, './multiProject');
export const empty = path.resolve(import.meta.dirname, './empty');
export const emptyWithFolder = path.resolve(import.meta.dirname, './emptyWithFolder');
export const embeddedEngineWorkspace = path.resolve(import.meta.dirname, './embeddedEngine');
export const minimalProjectWorkspacePath = path.resolve(import.meta.dirname, './minimalProject');
export const iarDependencyWorkspacePath = path.resolve(import.meta.dirname, './iarDependencyProject');
export const outdatedProjectWorkspacePath = path.resolve(import.meta.dirname, './outdatedProject');
export const portalPerformanceWorkspacePath = path.resolve(import.meta.dirname, './portalPerformance');
export const multiRootWorkspacePath = path.resolve(import.meta.dirname, './multiProject/multiRootWorkspace.code-workspace');
export const screenshotProject = path.resolve(import.meta.dirname, './screenshotProject');
export const properMultiProjectPath = path.resolve(import.meta.dirname, './properMultiProject');
export const properMultiProjectJavaPath = path.resolve(import.meta.dirname, './properMultiProjectJava');
export const dependencyClashWorkspacePath = path.resolve(import.meta.dirname, './dependencyClash');
export const projectNameConflictPath = path.resolve(import.meta.dirname, './projectNameConflict');
