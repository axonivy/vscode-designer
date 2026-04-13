import { Flex, IvyIcon, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@axonivy/ui-components';
import type { Shortcut } from './shortcut/Shortcut';

export const Command = ({ title, value, icon, description, onClick }: Shortcut) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className='flex h-15 cursor-pointer items-center justify-start gap-1 rounded-lg border border-n200 bg-n50 p-2 text-sm hover:bg-n100'
            onClick={() => onClick(value)}
          >
            <IvyIcon icon={icon} className='text-2xl text-p75' />
            {title}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <Flex direction='row'>
            <span>{description}</span>
          </Flex>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
