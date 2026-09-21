import type { RuntimeLogEntry } from './log';

export interface LogRequestTypes {
  data: [RuntimeLogEntry[], RuntimeLogEntry[]];
  clear: [];
}

export interface LogOnNotificationTypes {
  newEntry: RuntimeLogEntry;
}
