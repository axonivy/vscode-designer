import { Button, cn, Flex, IvyIcon } from '@axonivy/ui-components';
import { IvyIcons } from '@axonivy/ui-icons';

import { useVscode } from '../../util/useVscode';
import './Shortcut.css';

export type Shortcut = { title: string; icon: IvyIcons; link: string; description: string; oversize?: boolean };

export const ShortcutCard = ({ title, icon, link, description, oversize }: Shortcut) => {
  const { openUrl } = useVscode();
  return (
    <Button className={cn('welcome-shortcut-card-button', oversize && 'shortcut-card-oversize')} onClick={() => openUrl(link)}>
      <Flex direction='column' gap={2} justifyContent='center' alignItems='center' className='welcome-shortcut-card'>
        <IvyIcon className='welcome-shortcut-icon' icon={icon} />
        <h3>{title}</h3>
        <span className='welcome-shortcut-description'>{description}</span>
      </Flex>
    </Button>
  );
};
