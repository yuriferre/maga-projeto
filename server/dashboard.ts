import type { Db } from "./db.ts";
import type { Competency, ContentBundle, Tag } from "../shared/schema.ts";
import {
  activityDays, attemptAccuracy, completedLessonsBetween, getWeekGoal, latestAssessment, listAssessments,
  readAloudAverage, reviewsBetween, speakingAverage, studySessionsBetween, tagStats, writingAverage, type RadarSample, type TagStat,
} from "./repo.ts";
import { weakTags } from "./warmup.ts";
import { computeStreak, localDate, overlapMs, weekBounds, weekStart } from "./time.ts";
import { parsePlacementAssessment, type PlacementAssessment, type PlacementResult } from "./placement.ts";

export type WeekGoal = { lessonsTarget: number; reviewsTarget: number; minutesTarget: number };
export type Dashboard = {
  since: string;
  radar: Record<Competency, RadarSample>;
  tags: { stats: Array<TagStat & { label: string; group: Tag["group"] }>; weak: string[] };
  streak: { current: number; best: number; activeToday: boolean };
  week: { weekStart: string; goal: WeekGoal | null; progress: { lessons: number; reviews: number; minutes: number } };
  placement: { latest: PlacementAssessment | null };
  timeline: Array<{ id: number; kind: string; ref: string; ts: string; summary: { level?: number; pct?: number } }>;
};

const DAY = 864e5;

/** Monta o painel a partir do banco. `nowIso` vem do relógio injetável do app; `days` é a janela do radar/heatmap. */
export function buildDashboard(db: Db, content: ContentBundle, nowIso: string, days: number): Dashboard {
  const since = new Date(Date.parse(nowIso) - days * DAY).toISOString();
  const radar: Record<Competency, RadarSample> = {
    LIS: attemptAccuracy(db, since, { blocks: ["listening"], tags: ["comp.listening"] }),
    REA: attemptAccuracy(db, since, { blocks: [], tags: ["comp.reading"] }),
    VOC: attemptAccuracy(db, since, { blocks: [], tags: ["comp.vocabulary"], tagPrefix: "vocab." }),
    WRI: writingAverage(db, since),
    SPK: speakingAverage(db, since, "score"),
    PRO: readAloudAverage(db, since),
    CNF: speakingAverage(db, since, "self_confidence"),
  };

  const byId = new Map(content.tags.map((t) => [t.id, t]));
  const stats = tagStats(db, since).map((s) => ({ ...s, label: byId.get(s.tag)?.label ?? s.tag, group: byId.get(s.tag)?.group ?? ("topic" as const) }));

  const ws = weekStart(nowIso);
  const { start, end } = weekBounds(ws);
  const goalRow = getWeekGoal(db, ws);
  const minutesMs = studySessionsBetween(db, start, end).reduce((sum, s) => sum + overlapMs(s.started_at, s.ended_at ?? s.started_at, start, end), 0);

  const placementRow = latestAssessment(db, "placement", "placement");
  const timeline = listAssessments(db).map((r) => {
    const s = JSON.parse(r.score_json) as Partial<PlacementResult>;
    return { id: r.id, kind: r.kind, ref: r.ref, ts: r.ts, summary: { level: s.level, pct: s.pct } };
  });

  return {
    since,
    radar,
    tags: { stats, weak: weakTags(db, new Date(nowIso)) },
    streak: computeStreak(activityDays(db), localDate(nowIso)),
    week: {
      weekStart: ws,
      goal: goalRow ? { lessonsTarget: goalRow.lessons_target, reviewsTarget: goalRow.reviews_target, minutesTarget: goalRow.minutes_target } : null,
      progress: { lessons: completedLessonsBetween(db, start, end), reviews: reviewsBetween(db, start, end), minutes: Math.floor(minutesMs / 60000) },
    },
    placement: { latest: placementRow ? parsePlacementAssessment(placementRow) : null },
    timeline,
  };
}
