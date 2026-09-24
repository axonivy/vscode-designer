import { createContext, use } from 'react';

type UsersnapContextValue = {
  open: () => Promise<void>;
};

export const UsersnapContext = createContext<UsersnapContextValue | null>(null);

export const useUsersnap = () => {
  return use(UsersnapContext);
};
