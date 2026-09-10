import { describe, it, expect } from "vitest";
import { localDate, addDays, localDayStart, weekStart, weekBounds, overlapMs, computeStreak } from "../server/time.ts";

// Datas construídas no fuso local da máquina, como o servidor faz em produção.
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0).toISOString();

describe("calendário local", () => {
  it("localDate uses the machine time zone", () => {
    expect(localDate(local(2026, 9, 9, 0))).toBe("2026-09-09");
    expect(localDate(local(2026, 9, 9, 23))).toBe("2026-09-09");
  });
  it("addDays crosses month boundaries", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
  });
  it("weekStart is the local Monday", () => {
    expect(weekStart(local(2026, 9, 9))).toBe("2026-09-07"); // quarta → segunda 7
    expect(weekStart(local(2026, 9, 7, 0))).toBe("2026-09-07"); // segunda
    expect(weekStart(local(2026, 9, 13, 23))).toBe("2026-09-07"); // domingo
    expect(weekStart(local(2026, 9, 14, 0))).toBe("2026-09-14");
  });
  it("weekBounds spans 7 local days", () => {
    const { start, end } = weekBounds("2026-09-07");
    expect(start).toBe(new Date(2026, 8, 7, 0, 0, 0).toISOString());
    expect(end).toBe(new Date(2026, 8, 14, 0, 0, 0).toISOString());
  });
  it("localDayStart is the local midnight of the date", () => {
    expect(localDayStart("2026-09-10")).toBe(new Date(2026, 8, 10, 0, 0, 0).toISOString());
  });
});

describe("overlapMs", () => {
  it("returns the intersection length in ms, 0 when disjoint", () => {
    expect(overlapMs("2026-09-07T10:00:00.000Z", "2026-09-07T11:00:00.000Z", "2026-09-07T10:30:00.000Z", "2026-09-08T00:00:00.000Z")).toBe(30 * 60000);
    expect(overlapMs("2026-09-07T10:00:00.000Z", "2026-09-07T11:00:00.000Z", "2026-09-07T11:00:00.000Z", "2026-09-08T00:00:00.000Z")).toBe(0);
  });
});

describe("computeStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(computeStreak(["2026-09-07", "2026-09-08", "2026-09-09"], "2026-09-09")).toEqual({ current: 3, best: 3, activeToday: true });
  });
  it("keeps the streak alive through yesterday, tracks the best run", () => {
    expect(computeStreak(["2026-09-01", "2026-09-02", "2026-09-08", "2026-09-08"], "2026-09-09")).toEqual({ current: 1, best: 2, activeToday: false });
  });
  it("is zero after a gap", () => {
    expect(computeStreak(["2026-09-05"], "2026-09-09")).toEqual({ current: 0, best: 1, activeToday: false });
    expect(computeStreak([], "2026-09-09")).toEqual({ current: 0, best: 0, activeToday: false });
  });
});
