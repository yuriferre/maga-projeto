import { describe, it, expect } from "vitest";
import { sm2, nextInterval, previewIntervals, maturity, INITIAL_STATE, GRADE_BUTTONS, type Grade } from "../shared/sm2.ts";
import { localDayStart, addDays, localDate } from "../shared/local-date.ts";

const now = new Date(2026, 8, 10, 15, 0, 0).toISOString();
const dueIn = (days: number) => localDayStart(addDays(localDate(now), days));

describe("sm2", () => {
  it.each<[Grade, number, number]>([[1, 1.96, 0], [3, 2.36, 1], [4, 2.5, 1], [5, 2.6, 1]])("primeira resposta com nota %s → ease %s, intervalo %s", (grade, ease, interval) => {
    const r = sm2(INITIAL_STATE, grade, now);
    expect(r.ease).toBeCloseTo(ease, 2);
    expect(r.intervalDays).toBe(interval);
  });
  it("segunda resposta boa dá 6 dias; terceira, round(6 × ease); due à meia-noite local", () => {
    const first = sm2(INITIAL_STATE, 4, now);
    expect(first).toMatchObject({ reps: 1, intervalDays: 1, lapses: 0, due: dueIn(1) });
    const second = sm2(first, 4, now);
    expect(second).toMatchObject({ reps: 2, intervalDays: 6, due: dueIn(6) });
    const third = sm2(second, 4, now);
    expect(third).toMatchObject({ reps: 3, intervalDays: 15, due: dueIn(15) });
  });
  it("nota < 3 zera reps e intervalo, soma lapso e vence agora", () => {
    const learned = sm2(sm2(INITIAL_STATE, 4, now), 4, now);
    const r = sm2(learned, 1, now);
    expect(r).toMatchObject({ reps: 0, intervalDays: 0, lapses: 1, due: now });
    // 1.96 (não 1.86): nextEase depende só de (ease, nota) — duas notas 4 mantêm ease em 2,5,
    // e nota 1 sobre ease 2,5 já está confirmado como 1,96 pelo teste it.each acima.
    expect(r.ease).toBeCloseTo(1.96, 2);
  });
  it("ease nunca cai abaixo de 1,3", () => {
    let s = { ...INITIAL_STATE };
    for (let i = 0; i < 10; i++) s = sm2(s, 1, now);
    expect(s.ease).toBe(1.3);
    expect(s.lapses).toBe(10);
  });
  it("intervalo mínimo de 1 dia com ease baixa", () => {
    expect(nextInterval({ ease: 1.3, intervalDays: 1, reps: 2, lapses: 0 }, 3)).toBe(1);
    expect(nextInterval(INITIAL_STATE, 1)).toBe(0);
  });
  it("previewIntervals reflete os quatro botões", () => {
    expect(previewIntervals(INITIAL_STATE)).toEqual({ again: 0, hard: 1, good: 1, easy: 1 });
    expect(previewIntervals({ ease: 2.5, intervalDays: 6, reps: 2, lapses: 0 })).toEqual({ again: 0, hard: Math.round(6 * 2.36), good: 15, easy: Math.round(6 * 2.6) });
    expect(GRADE_BUTTONS.map((b) => b.grade)).toEqual([1, 3, 4, 5]);
  });
  it("maturity: novo (reps 0), aprendendo (< 21 d), maduro (≥ 21 d)", () => {
    expect(maturity({ reps: 0, intervalDays: 0 })).toBe("new");
    expect(maturity({ reps: 3, intervalDays: 20 })).toBe("learning");
    expect(maturity({ reps: 3, intervalDays: 21 })).toBe("mature");
  });
});
