import { Flex } from '@axonivy/ui-components';
import { useTranslation } from 'react-i18next';

export const WelcomePage = () => {
  const { t } = useTranslation();
  return (
    <Flex direction='row'>
      <h1>{t('welcomeToProDesigner')}</h1>
    </Flex>
  );
};
