import { Button, cn, Flex, IvyIcon } from '@axonivy/ui-components';
import { IvyIcons } from '@axonivy/ui-icons';

import './Shortcut.css';

export type Shortcut = {
  title: string;
  icon: IvyIcons;
  value: string;
  description: string;
  onClick: (value: string) => void;
  oversize?: boolean;
};

export const ShortcutCard = ({ title, icon, value, description, onClick, oversize }: Shortcut) => {
  return (
    <Button className={cn('welcome-shortcut-card-button', oversize && 'shortcut-card-oversize')} onClick={() => onClick(value)}>
      <Flex direction='column' gap={2} justifyContent='center' alignItems='center' className='welcome-shortcut-card'>
        <IvyIcon className='welcome-shortcut-icon' icon={icon} />
        <h3>{title}</h3>
        <span className='welcome-shortcut-description'>{description}</span>
      </Flex>
    </Button>
  );
};
