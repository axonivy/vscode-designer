import { Button } from '@axonivy/ui-components';
import { IvyIcons } from '@axonivy/ui-icons';
import { useTranslation } from 'react-i18next';
import { useUsersnap } from './UsersnapContext';

export const UsersnapButton = () => {
  const usersnap = useUsersnap();
  const { t } = useTranslation();

  return (
    <Button
      icon={IvyIcons.Comment}
      className='absolute right-0 bottom-12 origin-bottom-right transform-[rotate(-90deg)_translateX(100%)_translateY(0)] rounded-b-none! bg-n900! text-background!'
      type='button'
      onClick={() => usersnap?.open()}
    >
      {t('feedback')}
    </Button>
  );
};
