import type { Exercise } from "../../shared/schema.ts";
import type { AttemptInput, LessonProgressRow, WritingRow } from "../../server/repo.ts";
import type { CompletionStatus } from "../../server/completion.ts";
import type { WritingFeedback } from "../../server/writing-feedback.ts";
import type { SpeakingMetrics } from "../../server/speaking-metrics.ts";
import type { TagStat } from "../../server/repo.ts";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // corpo não é JSON; mantém a mensagem padrão
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

const post = <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export type LessonStatus = { progress: LessonProgressRow | null; completion: CompletionStatus };

export const api = {
  overview: () => request<{ lessons: LessonProgressRow[] }>("/api/progress/overview"),
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
};
