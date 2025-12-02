import { Button, Flex, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@axonivy/ui-components';
import './Command.css';
import type { Shortcut } from './shortcut/Shortcut';

export const Command = ({ title, value, icon, description, onClick }: Shortcut) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button className='welcome-page-link' onClick={() => onClick(value)} icon={icon}>
            {title}
          </Button>
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
