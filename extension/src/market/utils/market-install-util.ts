import type { ProjectSelection } from '../../project-explorer/utils/multi-step-input';
import type { ProductProjectSelection } from '../import-market';

export const validateProjectSelection = (
  selectedProjects: Array<ProductProjectSelection>,
  existingProjects: Array<ProjectSelection>
): string | undefined => {
  const conflictingProjects = selectedProjects.filter(
    project => project.artifactId && existingProjects.some(existing => existing.label === project.artifactId)
  );
  if (conflictingProjects.length > 0) {
    return `The following projects cannot be installed because a project folder with the same name already exists: ${conflictingProjects.map(p => p.artifactId).join(', ')}`;
  }
};
