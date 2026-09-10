import { addDays, localDate, localDayStart } from "./local-date.ts";

export type CardState = { ease: number; intervalDays: number; reps: number; lapses: number };
export type Sm2Result = CardState & { due: string };
export type Grade = 0 | 1 | 2 | 3 | 4 | 5;
export type Maturity = "new" | "learning" | "mature";

export const INITIAL_STATE: CardState = { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0 };
/** Intervalo a partir do qual um card é considerado maduro (corte do Anki). */
export const MATURE_DAYS = 21;
/** Botões da tela de revisão → nota SM-2. */
export const GRADE_BUTTONS = [
  { key: "again", label: "Errei", grade: 1 },
  { key: "hard", label: "Difícil", grade: 3 },
  { key: "good", label: "Bom", grade: 4 },
  { key: "easy", label: "Fácil", grade: 5 },
] as const;
export type GradeKey = (typeof GRADE_BUTTONS)[number]["key"];

/** Fator de facilidade após a resposta: EF + 0,1 − (5 − q)(0,08 + (5 − q) · 0,02), nunca abaixo de 1,3. */
function nextEase(ease: number, grade: number): number {
  const q = 5 - grade;
  return Math.max(1.3, ease + 0.1 - q * (0.08 + q * 0.02));
}

/** Intervalo em dias após a resposta: 0 (volta agora) para nota < 3; 1, 6, depois round(intervalo × ease). */
export function nextInterval(state: CardState, grade: number): number {
  if (grade < 3) return 0;
  const reps = state.reps + 1;
  if (reps === 1) return 1;
  if (reps === 2) return 6;
  return Math.max(1, Math.round(state.intervalDays * nextEase(state.ease, grade)));
}

/** SM-2: nota < 3 reinicia o card e vence agora; nota ≥ 3 agenda para a meia-noite local de hoje + intervalo. */
export function sm2(state: CardState, grade: Grade, nowIso: string): Sm2Result {
  const ease = Number(nextEase(state.ease, grade).toFixed(2));
  if (grade < 3) return { ease, intervalDays: 0, reps: 0, lapses: state.lapses + 1, due: nowIso };
  const intervalDays = nextInterval(state, grade);
  return { ease, intervalDays, reps: state.reps + 1, lapses: state.lapses, due: localDayStart(addDays(localDate(nowIso), intervalDays)) };
}

/** Prévia do intervalo de cada botão, para o rótulo "em N dias". */
export function previewIntervals(state: CardState): Record<GradeKey, number> {
  return { again: 0, hard: nextInterval(state, 3), good: nextInterval(state, 4), easy: nextInterval(state, 5) };
}

export function maturity(state: Pick<CardState, "reps" | "intervalDays">): Maturity {
  if (state.reps === 0) return "new";
  return state.intervalDays >= MATURE_DAYS ? "mature" : "learning";
}
