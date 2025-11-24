import { IvyIcons } from '@axonivy/ui-icons';
import { useTranslation } from 'react-i18next';
import { useVscode } from '../../util/useVscode';
import type { Shortcut } from './Shortcut';

export const useShortcuts = () => {
  const { t } = useTranslation();
  const { openUrl, executeCommand } = useVscode();
  const gettingStartedShortcut: Shortcut = {
    title: t('shortcut.gettingStarted'),
    value: 'https://www.axonivy.com/tutorials',
    description: t('shortcut.gettingStartedDescription'),
    icon: IvyIcons.Help,
    oversize: true,
    callback: openUrl
  };

  const shortcuts: Array<Shortcut> = [
    {
      title: t('shortcut.documentation'),
      value: 'https://dev.axonivy.com/doc',
      description: t('shortcut.documentationDescription'),
      icon: IvyIcons.File,
      callback: openUrl
    },
    {
      title: t('shortcut.market'),
      value: 'https://market.axonivy.com/',
      description: t('shortcut.marketDescription'),
      icon: IvyIcons.Market,
      callback: openUrl
    },
    {
      title: t('shortcut.community'),
      value: 'https://community.axonivy.com/',
      description: t('shortcut.communityDescription'),
      icon: IvyIcons.Comment,
      callback: openUrl
    },
    {
      title: t('shortcut.news'),
      value: 'https://dev.axonivy.com/news',
      description: t('shortcut.newsDescription'),
      icon: IvyIcons.InfoCircle,
      callback: openUrl
    }
  ];

  const commandShortcuts: Array<Shortcut> = [
    {
      title: t('commands.newProject'),
      value: 'ivyProjects.addNewProject',
      description: t('commands.newProjectDescr'),
      icon: IvyIcons.FolderOpen,
      callback: executeCommand
    },
    {
      title: t('commands.addBusinessProcess'),
      value: 'ivyProjects.addBusinessProcess',
      description: t('commands.addBusinessProcessDescr'),
      icon: IvyIcons.Process,
      callback: executeCommand
    },
    {
      title: t('commands.addNewFormDialog'),
      value: 'ivyProjects.addNewFormDialog',
      description: t('commands.addNewFormDialogDescr'),
      icon: IvyIcons.UserDialog,
      callback: executeCommand
    },
    {
      title: t('commands.importBpmnProcess'),
      value: 'ivyProjects.importBpmnProcess',
      description: t('commands.importBpmnProcessDescr'),
      icon: IvyIcons.Bpmn,
      callback: executeCommand
    },
    {
      title: t('commands.downloadDevEngine'),
      value: 'engine.downloadDevEngine',
      description: t('commands.downloadDevEngineDescr'),
      icon: IvyIcons.Ivy,
      callback: executeCommand
    },
    {
      title: t('commands.openNeo'),
      value: 'ivyBrowserView.openNEO',
      description: t('commands.openNeoDescr'),
      icon: IvyIcons.Edit,
      callback: executeCommand
    },
    {
      title: t('commands.openCockpit'),
      value: 'ivyBrowserView.openEngineCockpit',
      description: t('commands.openCockpitDescr'),
      icon: IvyIcons.Settings,
      callback: executeCommand
    }
  ];

  return {
    shortcuts,
    gettingStartedShortcut,
    commandShortcuts
  };
};
