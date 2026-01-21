const timers = new Map<string, NodeJS.Timeout>();
export const debouncedAction = (action: () => void, key: string, timeout: number) => {
  return () => {
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
    }, timeout);
    timers.set(key, timer);
  };
};
