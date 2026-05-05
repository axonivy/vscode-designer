import { ThemeProvider } from '@axonivy/ui-components';
import '@axonivy/ui-graph/lib/graph.css';
import { initMessenger } from '@axonivy/vscode-webview-common';
import '@axonivy/vscode-webview-common/css/colors.css';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Messenger, type VsCodeApi } from 'vscode-messenger-webview';
import { ProjectGraph, type ProjectGraphBean } from './ProjectGraph';
import './index.css';

declare function acquireVsCodeApi(): VsCodeApi;
const messenger = new Messenger(acquireVsCodeApi());
const ProjectGraphProjectsNotification = { method: 'projectGraph/projects' };

export async function start(): Promise<void> {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  const root = createRoot(rootElement);
  let projects: Array<ProjectGraphBean> = [];

  const render = () => {
    root.render(
      <React.StrictMode>
        <ThemeProvider disabled={true}>
          <ProjectGraph projects={projects} messenger={messenger} />
        </ThemeProvider>
      </React.StrictMode>
    );
  };

  messenger.onNotification(ProjectGraphProjectsNotification, projectData => {
    projects = Array.isArray(projectData) ? (projectData as Array<ProjectGraphBean>) : [];
    render();
  });

  render();
}

initMessenger(messenger, start);
