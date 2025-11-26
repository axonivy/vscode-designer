import { Button, Flex } from '@axonivy/ui-components';
import { useTranslation } from 'react-i18next';
import { useVscode } from '../util/useVscode';

type Command = {
  title: string;
  command: string;
};

const commands: Array<Command> = [
  {
    command: 'ivyBrowserView.openEngineCockpit',
    title: 'Open Engine Cockpit'
  },
  {
    command: 'ivyBrowserView.openNEO',
    title: 'Open NEO'
  },
  {
    command: 'engine.downloadDevEngine',
    title: 'Download Dev Engine'
  },
  {
    command: 'ivyProjects.addBusinessProcess',
    title: 'New Business Process'
  },
  {
    command: 'ivyProjects.importBpmnProcess',
    title: 'Import BPMN Process'
  },
  {
    command: 'ivyProjects.addNewProject',
    title: 'New Project'
  },
  {
    command: 'ivyProjects.addNewFormDialog',
    title: 'New Form Dialog'
  }
];

export const GettingStartedCommands = () => {
  const { t } = useTranslation();
  const { executeCommand } = useVscode();
  return (
    <Flex className='command-section' gap={4}>
      <Flex direction='column' className='shortcut-section' gap={4}>
        <h2>{t('commands')}</h2>
        {commands.map(c => (
          <Button key={c.title} onClick={() => executeCommand(c.command)}>
            {c.title}
          </Button>
        ))}
      </Flex>
    </Flex>
  );
};
