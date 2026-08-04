const timers = new Map<string, NodeJS.Timeout>();

export type ActionKey = 'deploy' | 'invalidate';

export const debouncedAction = (action: () => void, actionKey: ActionKey, keyPrefix?: string) => {
  return () => {
    const key = `${keyPrefix}:${actionKey}`;
    let timer = timers.get(key);
    if (timer) {
      timer.refresh();
      return;
    }
    timer = setTimeout(() => {
      try {
        action();
      } finally {
        timers.delete(key);
      }
    }, 1_000);
    timers.set(key, timer);
  };
};

export const hasDeployActionInQueue = () => {
  return Array.from(timers.keys()).some(key => key.endsWith(':deploy'));
};
