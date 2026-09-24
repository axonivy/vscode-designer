import { loadSpace, type SpaceApi, type SpaceOpenEventCallback } from '@usersnap/browser';
import React, { useEffect, useRef, useState } from 'react';
import { SystemInfo } from '../../util/SystemInfo';
import { useMessenger } from '../../util/VscodeApiProvider';
import { UsersnapContext } from './UsersnapContext';

const USERSNAP_SPACE_API_KEY = '12635d4b-ee9a-4b24-a3d9-98e6c8b7bd9e';
const USERSNAP_PROJECT_API_KEY = 'b4b86e06-a72f-445d-97e2-82967d7e8002';

const getCspNonce = () => document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content;

export const UsersnapProvider = ({ children }: React.PropsWithChildren) => {
  const [usersnapApi, setUsersnapApi] = useState<SpaceApi | null>(null);
  const systemInfoRef = useRef<SystemInfo>(null);
  const { messenger } = useMessenger();

  useEffect(() => {
    let api: SpaceApi | undefined;

    const handleOpenWidget: SpaceOpenEventCallback = event => {
      event.api.setValue('custom', {
        ...systemInfoRef.current
      });
    };

    loadSpace(USERSNAP_SPACE_API_KEY, getCspNonce()).then(loadedApi => {
      api = loadedApi;
      api.on('open', handleOpenWidget);
      api.init();

      setUsersnapApi(api);
    });

    return () => {
      api?.off('open', handleOpenWidget);
    };
  }, []);

  const open = async () => {
    if (!usersnapApi) {
      return;
    }

    systemInfoRef.current = await SystemInfo.get(messenger);

    const widgetApi = await usersnapApi.show(USERSNAP_PROJECT_API_KEY);
    widgetApi.open();
  };

  return <UsersnapContext value={{ open }}>{children}</UsersnapContext>;
};
