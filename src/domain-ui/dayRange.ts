import type { IsoString } from '../domain/types';

/** A local-day window: `start` inclusive, `end` exclusive. */
export interface DayRange {
  start: IsoString;
  end: IsoString;
}

/**
 * The local calendar day containing `now`. `end` is built with `date + 1`
 * so month/year roll over and a DST day is not forced to 24 hours.
 */
export function todayRange(now: Date = new Date()): DayRange {
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  return {
    start: new Date(year, month, date, 0, 0, 0, 0).toISOString(),
    end: new Date(year, month, date + 1, 0, 0, 0, 0).toISOString(),
  };
}
