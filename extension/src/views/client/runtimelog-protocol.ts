import type { RuntimeLogEntry } from '../generated/runtime-log';

export interface LogRequestTypes {
  data: [RuntimeLogEntry[], RuntimeLogEntry[]];
  clear: [];
}

export interface LogOnNotificationTypes {
  newEntry: RuntimeLogEntry;
}
