const timers = new Map<string, NodeJS.Timeout>();

export type ActionKey = 'deploy' | 'invalidate';

export const debouncedAction = (action: () => void, actionKey: ActionKey, keyPrefix?: string) => {
  return () => {
    const key = `${keyPrefix}:${actionKey}`;
    let delay = 1_000;
    let timer = timers.get(key);
    if (timer) {
      clearTimeout(timer);
      delay = 3_000;
    }
    timer = createTimer(action, key, delay);
    timers.set(key, timer);
  };
};

const createTimer = (action: () => void, key: string, delay: number) => {
  return setTimeout(() => {
    try {
      action();
    } finally {
      timers.delete(key);
    }
  }, delay);
};

export const hasDeployActionInQueue = () => {
  return Array.from(timers.keys()).some(key => key.endsWith(':deploy'));
};
