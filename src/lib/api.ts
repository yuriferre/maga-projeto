import type { Block, Exercise } from "../../shared/schema.ts";
import type { AttemptInput, LessonProgressRow, SpeakingRow, TagStat, WritingRow } from "../../server/repo.ts";
import type { CompletionStatus } from "../../server/completion.ts";
import type { WritingFeedback } from "../../server/writing-feedback.ts";
import type { SpeakingMetrics } from "../../server/speaking-metrics.ts";
import type { PlacementAssessment, PlacementSpeakingMetrics } from "../../server/placement.ts";
import type { Dashboard, WeekGoal } from "../../server/dashboard.ts";
import type { CardCounts, CardRow } from "../../server/repo.ts";
import type { Maturity } from "../../shared/sm2.ts";
import type { AssessmentRecord, AssessmentMissing } from "../../server/assessment.ts";

/** Erro HTTP com o corpo da resposta (ex.: 409 do finish traz `missing`). */
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    let body: unknown = null;
    try {
      body = await res.json();
      const err = (body as { error?: string }).error;
      if (err) message = err;
    } catch {
      // corpo não é JSON; mantém a mensagem padrão
    }
    throw new ApiError(message, res.status, body);
  }
  return (await res.json()) as T;
}

const post = <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) });

export type LessonStatus = { progress: LessonProgressRow | null; completion: CompletionStatus };
export type PlacementState = { latest: PlacementAssessment | null; run: { answered: string[]; writing: WritingRow | null; speaking: SpeakingRow | null } };
export type ReadAloudEntry = { target: string; transcript: string };
export type ModuleSummary = { passed: boolean; latest: AssessmentRecord | null };
export type ModuleAssessmentState = {
  eligible: { lessonsTotal: number; lessonsDone: number; missing: string[] };
  latest: AssessmentRecord | null;
  run: { answered: string[]; writing: WritingRow | null; speaking: SpeakingRow | null };
};
export type { Block, Exercise, WeekGoal, Dashboard, PlacementAssessment, PlacementSpeakingMetrics, WritingRow, SpeakingRow, WritingFeedback, SpeakingMetrics, TagStat, CardRow, CardCounts, Maturity, AssessmentRecord, AssessmentMissing };

export const api = {
  overview: () => request<{ lessons: LessonProgressRow[]; modules: Record<string, ModuleSummary> }>("/api/progress/overview"),
  tagStats: (days = 30) => request<{ since: string; stats: TagStat[]; weak: string[] }>(`/api/tags/stats?days=${days}`),
  startLesson: (id: string) => post<{ progress: LessonProgressRow | null }>(`/api/lessons/${id}/start`),
  lessonStatus: (id: string) => request<LessonStatus>(`/api/lessons/${id}/status`),
  completeLesson: (id: string) => post<LessonStatus & { cardsInserted: number }>(`/api/lessons/${id}/complete`),
  warmup: (id: string) => request<{ items: Exercise[] }>(`/api/lessons/${id}/warmup`),
  latestWriting: (id: string) => request<{ submission: WritingRow | null }>(`/api/lessons/${id}/writing/latest`),
  submitWriting: (id: string, body: { text: string; selfScore?: number }) => post<{ id: number; feedback: WritingFeedback }>(`/api/lessons/${id}/writing`, body),
  submitSpeaking: (id: string, body: { mode: "A"; transcript: string; durationSec: number; selfConfidence?: number }) =>
    post<{ id: number; metrics: SpeakingMetrics }>(`/api/lessons/${id}/speaking`, body),
  postAttempt: (a: AttemptInput) => post<{ id: number }>("/api/attempts", a),

  // teste inicial
  placementState: () => request<PlacementState>("/api/placement/state"),
  submitPlacementWriting: (body: { text: string; selfScore?: number }) => post<{ id: number; feedback: WritingFeedback }>("/api/placement/writing", body),
  submitPlacementSpeaking: (body: { readAloud: ReadAloudEntry[]; transcript: string; durationSec: number; selfConfidence?: number }) =>
    post<{ id: number; metrics: PlacementSpeakingMetrics }>("/api/placement/speaking", body),
  finishPlacement: () => post<{ assessment: PlacementAssessment }>("/api/placement/finish"),

  // avaliação de módulo
  moduleAssessmentState: (id: string) => request<ModuleAssessmentState>(`/api/modules/${id}/assessment/state`),
  submitModuleWriting: (id: string, body: { text: string; selfScore?: number }) => post<{ id: number; feedback: WritingFeedback }>(`/api/modules/${id}/assessment/writing`, body),
  submitModuleSpeaking: (id: string, body: { mode: "A"; transcript: string; durationSec: number; selfConfidence?: number }) =>
    post<{ id: number; metrics: SpeakingMetrics }>(`/api/modules/${id}/assessment/speaking`, body),
  finishModuleAssessment: (id: string) => post<{ assessment: AssessmentRecord }>(`/api/modules/${id}/assessment/finish`),

  // painel, metas, sessões
  dashboard: (days = 30) => request<Dashboard>(`/api/dashboard?days=${days}`),
  setWeekGoal: (goal: WeekGoal) => put<{ weekStart: string; goal: WeekGoal }>("/api/goals/week", goal),
  heartbeat: (lessonId?: string) => post<{ sessionId: number; resumed: boolean }>("/api/study/heartbeat", lessonId ? { lessonId } : {}),

  // SRS
  srsQueue: (limit = 50) => request<{ cards: CardRow[]; counts: CardCounts }>(`/api/srs/queue?limit=${limit}`),
  srsReview: (cardId: number, grade: number) => post<{ card: CardRow; maturity: Maturity; counts: CardCounts }>("/api/srs/review", { cardId, grade }),
  addCard: (body: { front: string; back: string; hint?: string; tag: string }) => post<{ inserted: boolean; id: number }>("/api/srs/cards", body),
};
