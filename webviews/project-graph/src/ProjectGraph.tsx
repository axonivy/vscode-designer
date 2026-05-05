import { Button } from '@axonivy/ui-components';
import { Graph, type GraphEdgeActionPayload, type NodeData } from '@axonivy/ui-graph';
import { IvyIcons } from '@axonivy/ui-icons';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import type { Messenger } from 'vscode-messenger-webview';

export type ProjectGraphBean = {
  id: { app: string; pmv: string };
  artifactId: string;
  groupId: string;
  version: string;
  dependencies?: Array<{ app: string; pmv: string }>;
};

const ProjectGraphAddDependencyNotification = { method: 'projectGraph/addDependency' };
const ProjectGraphOpenPomNotification = { method: 'projectGraph/openPom' };

export const ProjectGraph = ({ projects, messenger }: { projects?: Array<ProjectGraphBean>; messenger: Messenger }) => {
  const onEdgeCreate = ({ sourceNodeId, targetNodeId }: GraphEdgeActionPayload) => {
    const source = projects?.find(p => p.id.pmv === sourceNodeId)?.id;
    const dependency = projects?.find(p => p.id.pmv === targetNodeId)?.id;
    if (!source || !dependency) {
      return;
    }
    messenger.sendNotification(ProjectGraphAddDependencyNotification, HOST_EXTENSION, { source, dependency });
  };

  const onOpenPom = (project: ProjectGraphBean) => {
    messenger.sendNotification(ProjectGraphOpenPomNotification, HOST_EXTENSION, project.id);
  };

  return (
    <Graph
      graphNodes={mapProjectsToGraphNodes(projects, onOpenPom)}
      options={{
        filter: { enabled: true, allLabel: 'Show All Projects' },
        minimap: false,
        editable: { enabled: true, onEdgeCreate },
        zoomOnInit: { level: 1, applyOnLayoutAndFilter: true }
      }}
    />
  );
};

export const mapProjectsToGraphNodes = (projects: Array<ProjectGraphBean> | undefined, onOpenPom: (project: ProjectGraphBean) => void) => {
  if (!projects) {
    return [];
  }

  return projects.map<NodeData>(project => ({
    id: project.id.pmv,
    label: project.id.pmv,
    content: <ProjectNodeContent project={project} />,
    options: {
      expandContent: true,
      controls: <ProjectGraphControls project={project} onOpenPom={onOpenPom} />
    },
    target: project.dependencies?.map(dep => ({ id: dep.pmv })) ?? []
  }));
};

const ProjectGraphControls = ({ project, onOpenPom }: { project: ProjectGraphBean; onOpenPom: (project: ProjectGraphBean) => void }) => {
  return (
    <Button
      type='button'
      size='small'
      onClick={event => {
        event.stopPropagation();
        onOpenPom(project);
      }}
      icon={IvyIcons.File}
    />
  );
};

const ProjectNodeContent = ({ project }: { project: ProjectGraphBean }) => (
  <ul style={{ padding: '0 10px', listStyle: 'none', margin: 0, overflow: 'auto' }}>
    {Object.entries({
      artifactId: project.artifactId,
      groupId: project.groupId,
      version: project.version,
      app: project.id.app
    }).map(([label, value]) => (
      <li key={label} style={{ display: 'flex', gap: '5px' }}>
        <div>{`${label}:`}</div>
        <div style={{ color: 'var(--N700)' }}>{value}</div>
      </li>
    ))}
  </ul>
);
