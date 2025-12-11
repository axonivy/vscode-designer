import { Button, type ButtonProps } from '@axonivy/ui-components';
import './SectionButton.css';

export const SectionButton = (props: ButtonProps) => {
  return <Button className='section-button' {...props}></Button>;
};
