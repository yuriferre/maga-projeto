import { describe, it, expect } from "vitest";
import { computeSpeakingMetrics } from "../server/speaking-metrics.ts";
import { loadContent } from "../shared/content-loader.ts";

const { lessons, brErrors } = loadContent("content");
const lesson = lessons["M01-02"]!;
const good = "Yesterday I got the build and lint stages working. I'm still on the integration tests. I've tried bumping the timeout but it didn't help. Heads up, this might slip to tomorrow. I'm waiting on a review from Ana. No blockers otherwise.";

describe("computeSpeakingMetrics", () => {
  it("scores a good update near the top", () => {
    const m = computeSpeakingMetrics(good, 30, lesson.speaking.modeA, brErrors);
    expect(m.used.length).toBeGreaterThanOrEqual(4);
    expect(m.findings).toEqual([]);
    expect(m.withinTime).toBe(true);
    expect(m.wpm).toBeGreaterThan(80);
    expect(m.score).toBeGreaterThanOrEqual(4);
  });
  it("scores a short, error-laden update low", () => {
    const m = computeSpeakingMetrics("I have a doubt, it's giving error", 60, lesson.speaking.modeA, brErrors);
    expect(m.withinTime).toBe(false);
    expect(m.score).toBeLessThanOrEqual(2);
  });
});
