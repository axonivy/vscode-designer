import { Flex } from '@axonivy/ui-components';
import { IvyIcons } from '@axonivy/ui-icons';
import { useTranslation } from 'react-i18next';
import { useVscode } from '../util/useVscode';
import { Command } from './Command';
import './CommandSection.css';

export const CommandSection = () => {
  const { t } = useTranslation();
  const { executeCommand } = useVscode();

  return (
    <Flex direction='column' className='command-section' gap={4} style={{ width: '100%' }}>
      <h2>{t('Start')}</h2>
      <div className='welcome-command-grid'>
        <Command
          title={t('commands.newProject')}
          value={'ivyProjects.addNewProject'}
          description={t('commands.newProjectDescr')}
          icon={IvyIcons.FolderOpen}
          onClick={executeCommand}
        />
        <Command
          title={t('commands.addBusinessProcess')}
          value={'ivyProjects.addBusinessProcess'}
          description={t('commands.addBusinessProcessDescr')}
          icon={IvyIcons.Process}
          onClick={executeCommand}
        />
        <Command
          title={t('commands.addNewFormDialog')}
          value={'ivyProjects.addNewFormDialog'}
          description={t('commands.addNewFormDialogDescr')}
          icon={IvyIcons.UserDialog}
          onClick={executeCommand}
        />
        <Command
          title={t('commands.importBpmnProcess')}
          value={'ivyProjects.importBpmnProcess'}
          description={t('commands.importBpmnProcessDescr')}
          icon={IvyIcons.Download}
          onClick={executeCommand}
        />
        <Command
          title={t('commands.downloadDevEngine')}
          value={'engine.downloadDevEngine'}
          description={t('commands.downloadDevEngineDescr')}
          icon={IvyIcons.Ivy}
          onClick={executeCommand}
        />
        <Command
          title={t('commands.openNeo')}
          value={'ivyBrowserView.openNEO'}
          description={t('commands.openNeoDescr')}
          icon={IvyIcons.Edit}
          onClick={executeCommand}
        />
      </div>
    </Flex>
  );
};
