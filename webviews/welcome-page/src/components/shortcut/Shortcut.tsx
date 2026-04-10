import { cn, Flex, IvyIcon } from '@axonivy/ui-components';
import { IvyIcons } from '@axonivy/ui-icons';

export type Shortcut = {
  title: string;
  icon: IvyIcons;
  value: string;
  description: string;
  onClick: (value: string) => void;
};

export const ShortcutCard = ({ title, icon, value, description, onClick }: Shortcut) => {
  return (
    <button
      className={cn(
        'flex size-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-n200 bg-n50 p-2 text-sm hover:bg-n100'
      )}
      onClick={() => onClick(value)}
    >
      <Flex direction='column' gap={2} justifyContent='center' alignItems='center'>
        <IvyIcon className='text-6xl text-p75' icon={icon} />
        <h3>{title}</h3>
        <span className='text-n900'>{description}</span>
      </Flex>
    </button>
  );
};
