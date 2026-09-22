import { Flex } from '@axonivy/ui-components';
import { IvyIcons } from '@axonivy/ui-icons';
import { useTranslation } from 'react-i18next';
import { useVscode } from '../util/useVscode';
import { Command } from './Command';

export const CommandSection = () => {
  const { t } = useTranslation();
  const { executeCommand } = useVscode();

  return (
    <Flex direction='column' gap={4} className='w-full'>
      <h2 className='text-lg font-bold'>{t('label.start')}</h2>
      <div className='grid grid-cols-4 gap-3'>
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
          title={t('commands.addNewJsfDialog')}
          value={'ivyProjects.addNewHtmlDialog'}
          description={t('commands.addNewJsfDialogDescr')}
          icon={IvyIcons.UserDialog}
          onClick={executeCommand}
        />
        <Command
          title={t('commands.addNewDataclass')}
          value={'ivyProjects.addNewDataClass'}
          description={t('commands.addNewDataclassDescr')}
          icon={IvyIcons.DataClass}
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
          title={t('commands.openPortal')}
          value={'ivyBrowserView.openPortal'}
          description={t('commands.openPortalDescr')}
          icon={IvyIcons.StartProgram}
          onClick={executeCommand}
        />
        <Command
          title={t('commands.openDevWorkflowUi')}
          value={'ivyBrowserView.openDevWfUi'}
          description={t('commands.openDevWorkflowUiDescr')}
          icon={IvyIcons.StartProgram}
          onClick={executeCommand}
        />
      </div>
    </Flex>
  );
};
