import { describe, expect, it } from "vitest";
import { todayRange } from "./dayRange";

describe("todayRange", () => {
  const cases: [string, Date, Date][] = [
    ["mid-month", new Date(2024, 5, 15, 13, 45, 12, 345), new Date(2024, 5, 15)],
    ["last day of a month", new Date(2024, 0, 31, 10, 0, 0, 0), new Date(2024, 0, 31)],
    ["31 December", new Date(2023, 11, 31, 8, 30, 0, 0), new Date(2023, 11, 31)],
    ["23:59:59.999 stays same day", new Date(2024, 5, 15, 23, 59, 59, 999), new Date(2024, 5, 15)],
    ["exactly local midnight", new Date(2024, 5, 15, 0, 0, 0, 0), new Date(2024, 5, 15)],
  ];

  it.each(cases)("%s", (_name, now, expectedStartDay) => {
    const { start, end } = todayRange(now);
    const s = new Date(start);
    const e = new Date(end);

    for (const d of [s, e]) {
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
      expect(d.getSeconds()).toBe(0);
      expect(d.getMilliseconds()).toBe(0);
    }

    expect(s.getTime()).toBe(expectedStartDay.getTime());

    const nextDay = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1);
    expect(e.getFullYear()).toBe(nextDay.getFullYear());
    expect(e.getMonth()).toBe(nextDay.getMonth());
    expect(e.getDate()).toBe(nextDay.getDate());
  });
});
