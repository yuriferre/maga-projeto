import { describe, it, expect } from "vitest";
import { loadContent } from "../shared/content-loader.ts";
import { checkExercise } from "../shared/scoring.ts";
import { checkAssessment, checkLevelAssessment } from "./lib/check-assessment.ts";

const bundle = loadContent("content");
const a = bundle.moduleAssessments["M01"]!;

describe("avaliações de módulo", () => {
  for (const moduleId of Object.keys(bundle.moduleAssessments)) checkAssessment(bundle, moduleId);
});

describe("avaliações de nível", () => {
  for (const id of Object.keys(bundle.levelAssessments)) checkLevelAssessment(bundle, Number(id.slice(1)), 30);
});

describe("content/modules/M01/assessment.yaml", () => {
  it.each(["have worked", "'ve worked", "have been working", "'ve been working"])("accepts the valid since variant %s in assessment and lesson", (response) => {
    for (const q of [a.items.find((q) => q.id === "M01-A01")!, bundle.lessons["M01-02"]!.quiz[0]!]) {
      expect(checkExercise(q, response).correct).toBe(true);
      expect(checkExercise(q, "am working").correct).toBe(false);
    }
  });
  it("requires correcting both dependency and waiting prepositions", () => {
    const q = a.items.find((q) => q.id === "M01-A05")!;
    for (const prep of ["on", "for"]) {
      expect(checkExercise(q, `The canary rollout depends on Ana's approval, so I'm waiting ${prep} her reply.`).correct).toBe(true);
    }
    for (const answer of [
      "The canary rollout depends of Ana's approval, so I'm waiting for her reply.",
      "The canary rollout depends on Ana's approval, so I'm waiting her reply.",
    ]) expect(checkExercise(q, answer).correct).toBe(false);
  });
  it.each(["seven out of ten", "7 out of 10", "seven out of 10", "7 out of ten"])("accepts the pipeline proportion in %s runs", (proportion) => {
    const q = a.items.find((q) => q.id === "M01-A08")!;
    expect(checkExercise(q, `The pipeline passed in ${proportion} runs.`).correct).toBe(true);
    expect(checkExercise(q, "The pipeline passed in ten out of seven runs.").correct).toBe(false);
  });
  it.each(["plan to", "intend to", "am planning to", "am intending to", "am going to"])("accepts intention variant %s with corrected discuss and access", (intention) => {
    const q = a.items.find((q) => q.id === "M01-A10")!;
    expect(checkExercise(q, `I ${intention} discuss the rollout with Ana before requesting access to staging.`).correct).toBe(true);
    expect(checkExercise(q, `I ${intention} discuss about the rollout with Ana before requesting access to staging.`).correct).toBe(false);
    expect(checkExercise(q, `I ${intention} discuss the rollout with Ana before requesting access for staging.`).correct).toBe(false);
  });
  it.each(["Currently I'm", "Currently, I'm", "I'm currently", "Right now I'm", "Right now, I'm", "At the moment I'm", "At the moment, I'm"])("accepts the natural currently variant %s", (beginning) => {
    const q = a.items.find((q) => q.id === "M01-A12")!;
    expect(checkExercise(q, `${beginning} working on the platform team's migration.`).correct).toBe(true);
    expect(checkExercise(q, "Actually I'm working on the platform team's migration.").correct).toBe(false);
  });
});

describe("content/modules/M02/assessment.yaml", () => {
  const m02 = bundle.moduleAssessments["M02"]!;
  it.each(["Can you", "Could you"])("accepts %s check the pod events as the do-modal fix", (modal) => {
    const q = m02.items.find((q) => q.id === "M02-A02")!;
    expect(checkExercise(q, `${modal} check the pod events?`).correct).toBe(true);
    expect(checkExercise(q, "Do you can check the pod events?").correct).toBe(false);
  });
  it("requires need + you + to, not need that you", () => {
    const q = m02.items.find((q) => q.id === "M02-A03")!;
    expect(checkExercise(q, "I need you to approve the freeze window before noon.").correct).toBe(true);
    expect(checkExercise(q, "I need that you approve the freeze window before noon.").correct).toBe(false);
  });
  it("accepts both sorry to interrupt and sorry to jump in", () => {
    const q = m02.items.find((q) => q.id === "M02-A04")!;
    expect(checkExercise(q, "interrupt").correct).toBe(true);
    expect(checkExercise(q, "jump in").correct).toBe(true);
    expect(checkExercise(q, "interrupting").correct).toBe(false);
  });
  it("accepts explain to me or explain without me, rejects explain me", () => {
    const q = m02.items.find((q) => q.id === "M02-A09")!;
    expect(checkExercise(q, "Can you explain to me what 'flapping' means?").correct).toBe(true);
    expect(checkExercise(q, "Can you explain what 'flapping' means?").correct).toBe(true);
    expect(checkExercise(q, "Can you explain me what 'flapping' means?").correct).toBe(false);
  });
});

describe("content/modules/M03/assessment.yaml", () => {
  const m03 = bundle.moduleAssessments["M03"]!;
  it("requires fixing both do-modal and send-to-me word order", () => {
    const q = m03.items.find((q) => q.id === "M03-A09")!;
    expect(checkExercise(q, "Can you send me the runbook?").correct).toBe(true);
    expect(checkExercise(q, "Could you send the runbook to me?").correct).toBe(true);
    expect(checkExercise(q, "Do you can send me the runbook?").correct).toBe(false);
    expect(checkExercise(q, "Can you send to me the runbook?").correct).toBe(false);
  });
  it("requires both waiting on/for and present perfect continuous for since", () => {
    const q = m03.items.find((q) => q.id === "M03-A11")!;
    expect(checkExercise(q, "I've been waiting on your reply since Monday.").correct).toBe(true);
    expect(checkExercise(q, "I've been waiting for your reply since Monday.").correct).toBe(true);
    expect(checkExercise(q, "I'm waiting on your reply since Monday.").correct).toBe(false);
    expect(checkExercise(q, "I've been waiting your reply since Monday.").correct).toBe(false);
  });
  it("requires dropping the preposition before next sprint", () => {
    const q = m03.items.find((q) => q.id === "M03-A05")!;
    expect(checkExercise(q, "The rollout continues next sprint.").correct).toBe(true);
    expect(checkExercise(q, "The rollout continues on next sprint.").correct).toBe(false);
  });
  it("requires didn't + base form and need + you + to", () => {
    const q = m03.items.find((q) => q.id === "M03-A13")!;
    expect(checkExercise(q, "I didn't see the flag — I need you to resend it.").correct).toBe(true);
    expect(checkExercise(q, "I didn't saw the flag — I need you to resend it.").correct).toBe(false);
    expect(checkExercise(q, "I didn't see the flag — I need that you resend it.").correct).toBe(false);
  });
});

describe("content/modules/M04/assessment.yaml", () => {
  const m04 = bundle.moduleAssessments["M04"]!;
  it("requires both 'I agree' and 'happened to me'", () => {
    const q = m04.items.find((q) => q.id === "M04-A06")!;
    expect(checkExercise(q, "I agree — it happened to me too on GKE.").correct).toBe(true);
    expect(checkExercise(q, "I agree — same here on GKE.").correct).toBe(true);
    expect(checkExercise(q, "I am agree — it happened to me too on GKE.").correct).toBe(false);
    expect(checkExercise(q, "I agree — it happened with me too on GKE.").correct).toBe(false);
  });
  it("requires both 'found' and bare 'to'", () => {
    const q = m04.items.find((q) => q.id === "M04-A09")!;
    expect(checkExercise(q, "We found the cause to close the ticket.").correct).toBe(true);
    expect(checkExercise(q, "We finded the cause to close the ticket.").correct).toBe(false);
    expect(checkExercise(q, "We found the cause for to close the ticket.").correct).toBe(false);
  });
});

describe("content/modules/M05/assessment.yaml", () => {
  const m05 = bundle.moduleAssessments["M05"]!;
  it("requires both third-person -s and 'arrives at'", () => {
    const q = m05.items.find((q) => q.id === "M05-A02")!;
    expect(checkExercise(q, "This service talks to the database and the packet arrives at the pod.").correct).toBe(true);
    expect(checkExercise(q, "This service talk to the database and the packet arrives at the pod.").correct).toBe(false);
    expect(checkExercise(q, "This service talks to the database and the packet arrive on the pod.").correct).toBe(false);
  });
  it("requires both 'deploy to' and 'runs on'", () => {
    const q = m05.items.find((q) => q.id === "M05-A05")!;
    expect(checkExercise(q, "We deploy to staging and the app runs on AWS.").correct).toBe(true);
    expect(checkExercise(q, "We deploy in staging and the app runs on AWS.").correct).toBe(false);
    expect(checkExercise(q, "We deploy to staging and the app runs in AWS.").correct).toBe(false);
  });
  it("requires both 'listens on' and bare 'data'", () => {
    const q = m05.items.find((q) => q.id === "M05-A06")!;
    expect(checkExercise(q, "The service listens on port 8080 and returns the data.").correct).toBe(true);
    expect(checkExercise(q, "The service listens in port 8080 and returns the data.").correct).toBe(false);
    expect(checkExercise(q, "The service listens on port 8080 and returns the datas.").correct).toBe(false);
  });
  it("requires both 'on the right' and 'sits'", () => {
    const q = m05.items.find((q) => q.id === "M05-A09")!;
    expect(checkExercise(q, "On the right is the database, and the queue sits at the bottom.").correct).toBe(true);
    expect(checkExercise(q, "In the right is the database, and the queue sits at the bottom.").correct).toBe(false);
    expect(checkExercise(q, "On the right is the database, and the queue sit at the bottom.").correct).toBe(false);
  });
});

describe("content/modules/M06/assessment.yaml", () => {
  const m06 = bundle.moduleAssessments["M06"]!;
  it("requires both 'steps to' and 'check whether'", () => {
    const q = m06.items.find((q) => q.id === "M06-A02")!;
    expect(checkExercise(q, "Add the steps to reproduce and check whether it fails on staging.").correct).toBe(true);
    expect(checkExercise(q, "Add the steps for reproduce and check whether it fails on staging.").correct).toBe(false);
    expect(checkExercise(q, "Add the steps to reproduce and verify if it fails on staging.").correct).toBe(false);
  });
  it("requires both bare 'agree' and bare 'revert'", () => {
    const q = m06.items.find((q) => q.id === "M06-A05")!;
    expect(checkExercise(q, "I agree it's risky — we can revert the deploy.").correct).toBe(true);
    expect(checkExercise(q, "I am agree it's risky — we can revert the deploy.").correct).toBe(false);
    expect(checkExercise(q, "I agree it's risky — we can revert back the deploy.").correct).toBe(false);
  });
  it("requires both 'understand' and 'question'", () => {
    const q = m06.items.find((q) => q.id === "M06-A08")!;
    expect(checkExercise(q, "I didn't understand the review — I have a question.").correct).toBe(true);
    expect(checkExercise(q, "I didn't understood the review — I have a question.").correct).toBe(false);
    expect(checkExercise(q, "I didn't understand the review — I have a doubt.").correct).toBe(false);
  });
  it("requires both 'fixes' and 'told me'", () => {
    const q = m06.items.find((q) => q.id === "M06-A10")!;
    expect(checkExercise(q, "The commit fixes the bug — the reviewer told me to push.").correct).toBe(true);
    expect(checkExercise(q, "The commit fix the bug — the reviewer told me to push.").correct).toBe(false);
    expect(checkExercise(q, "The commit fixes the bug — the reviewer said me to push.").correct).toBe(false);
  });
});

describe("content/modules/M07/assessment.yaml", () => {
  const m07 = bundle.moduleAssessments["M07"]!;
  it("requires both 'estimate' and 'commitment'", () => {
    const q = m07.items.find((q) => q.id === "M07-A02")!;
    expect(checkExercise(q, "My estimate is five points, but I have a commitment at 3pm.").correct).toBe(true);
    expect(checkExercise(q, "My estimative is five points, but I have a commitment at 3pm.").correct).toBe(false);
    expect(checkExercise(q, "My estimate is five points, but I have a compromise at 3pm.").correct).toBe(false);
  });
  it("requires both 'makes' and 'depends on'", () => {
    const q = m07.items.find((q) => q.id === "M07-A06")!;
    expect(checkExercise(q, "It makes sense — the story depends on the spike.").correct).toBe(true);
    expect(checkExercise(q, "It make sense — the story depends on the spike.").correct).toBe(false);
    expect(checkExercise(q, "It makes sense — the story depends of the spike.").correct).toBe(false);
  });
  it("requires both bare 'discuss' and 'question'", () => {
    const q = m07.items.find((q) => q.id === "M07-A09")!;
    expect(checkExercise(q, "Let's discuss the scope — I have a question.").correct).toBe(true);
    expect(checkExercise(q, "Let's discuss about the scope — I have a question.").correct).toBe(false);
    expect(checkExercise(q, "Let's discuss the scope — I have a doubt.").correct).toBe(false);
  });
  it("requires both 'told me' and 'need the criteria to'", () => {
    const q = m07.items.find((q) => q.id === "M07-A10")!;
    expect(checkExercise(q, "He told me we need the criteria to stay fixed.").correct).toBe(true);
    expect(checkExercise(q, "He said me we need the criteria to stay fixed.").correct).toBe(false);
    expect(checkExercise(q, "He told me we need that the criteria stay fixed.").correct).toBe(false);
  });
  it("requires both 'explain to me' and 'clearer'", () => {
    const q = m07.items.find((q) => q.id === "M07-A13")!;
    expect(checkExercise(q, "Can you explain the criteria to me? The new version is clearer.").correct).toBe(true);
    expect(checkExercise(q, "Can you explain the criteria? The new version is clearer.").correct).toBe(true);
    expect(checkExercise(q, "Can you explain me the criteria? The new version is clearer.").correct).toBe(false);
    expect(checkExercise(q, "Can you explain the criteria to me? The new version is more clear.").correct).toBe(false);
  });
});

describe("content/modules/M08/assessment.yaml", () => {
  const m08 = bundle.moduleAssessments["M08"]!;
  it("requires both 'made' and 'morale'", () => {
    const q = m08.items.find((q) => q.id === "M08-A02")!;
    expect(checkExercise(q, "We made a mistake in the rollout — the team morale dropped after.").correct).toBe(true);
    expect(checkExercise(q, "We did a mistake in the rollout — the team morale dropped after.").correct).toBe(false);
    expect(checkExercise(q, "We made a mistake in the rollout — the team moral dropped after.").correct).toBe(false);
  });
  it("requires both bare 'agree' and 'told me'", () => {
    const q = m08.items.find((q) => q.id === "M08-A05")!;
    expect(checkExercise(q, "I agree — she told me the notes were thin.").correct).toBe(true);
    expect(checkExercise(q, "I am agree — she told me the notes were thin.").correct).toBe(false);
    expect(checkExercise(q, "I agree — she said me the notes were thin.").correct).toBe(false);
  });
  it("requires both 'question' and 'explain to me'", () => {
    const q = m08.items.find((q) => q.id === "M08-A06")!;
    expect(checkExercise(q, "I have a question — can you explain the senior rubric to me?").correct).toBe(true);
    expect(checkExercise(q, "I have a doubt — can you explain the senior rubric to me?").correct).toBe(false);
    expect(checkExercise(q, "I have a question — can you explain me the senior rubric?").correct).toBe(false);
  });
  it("requires both 'some feedback' and 'need you to'", () => {
    const q = m08.items.find((q) => q.id === "M08-A07")!;
    expect(checkExercise(q, "He gave me some feedback — I need you to repeat it.").correct).toBe(true);
    expect(checkExercise(q, "He gave me a feedback — I need you to repeat it.").correct).toBe(false);
    expect(checkExercise(q, "He gave me some feedback — I need that you repeat it.").correct).toBe(false);
  });
  it("requires both 'bored' and 'makes'", () => {
    const q = m08.items.find((q) => q.id === "M08-A08")!;
    expect(checkExercise(q, "I'm bored in long retros — it makes sense to timebox them.").correct).toBe(true);
    expect(checkExercise(q, "I'm boring in long retros — it makes sense to timebox them.").correct).toBe(false);
    expect(checkExercise(q, "I'm bored in long retros — it make sense to timebox them.").correct).toBe(false);
  });
  it("requires both 'depends on' and 'currently'", () => {
    const q = m08.items.find((q) => q.id === "M08-A09")!;
    expect(checkExercise(q, "My workload depends on the sprint — currently I'm on three projects.").correct).toBe(true);
    expect(checkExercise(q, "My workload depends of the sprint — currently I'm on three projects.").correct).toBe(false);
    expect(checkExercise(q, "My workload depends on the sprint — actually I'm on three projects.").correct).toBe(false);
  });
});

describe("content/modules/M09/assessment.yaml", () => {
  const m09 = bundle.moduleAssessments["M09"]!;
  it("requires both 'left a comment' and 'it's worth'", () => {
    const q = m09.items.find((q) => q.id === "M09-A02")!;
    expect(checkExercise(q, "I left a comment on the cache PR — it's worth a look.").correct).toBe(true);
    expect(checkExercise(q, "I did a comment on the cache PR — it's worth a look.").correct).toBe(false);
    expect(checkExercise(q, "I left a comment on the cache PR — it worths a look.").correct).toBe(false);
  });
  it("requires both 'seems to me' and 'in my view'", () => {
    const q = m09.items.find((q) => q.id === "M09-A05")!;
    expect(checkExercise(q, "The ordering seems wrong to me — in my view, the invalidate runs first.").correct).toBe(true);
    expect(checkExercise(q, "The ordering seems me wrong — in my view, the invalidate runs first.").correct).toBe(false);
    expect(checkExercise(q, "The ordering seems wrong to me — according to me, the invalidate runs first.").correct).toBe(false);
  });
  it("requires both bare 'agree' and 'told me'", () => {
    const q = m09.items.find((q) => q.id === "M09-A06")!;
    expect(checkExercise(q, "I agree — he told me the retry test was missing.").correct).toBe(true);
    expect(checkExercise(q, "I am agree — he told me the retry test was missing.").correct).toBe(false);
    expect(checkExercise(q, "I agree — he said me the retry test was missing.").correct).toBe(false);
  });
  it("requires both 'question' and 'explain to me'", () => {
    const q = m09.items.find((q) => q.id === "M09-A07")!;
    expect(checkExercise(q, "I have a question about this line — can you explain the guard to me?").correct).toBe(true);
    expect(checkExercise(q, "I have a doubt about this line — can you explain the guard to me?").correct).toBe(false);
    expect(checkExercise(q, "I have a question about this line — can you explain me the guard?").correct).toBe(false);
  });
  it("requires both 'clearer' and 'makes'", () => {
    const q = m09.items.find((q) => q.id === "M09-A08")!;
    expect(checkExercise(q, "The extracted helper is clearer — it makes sense to use it.").correct).toBe(true);
    expect(checkExercise(q, "The extracted helper is more clear — it makes sense to use it.").correct).toBe(false);
    expect(checkExercise(q, "The extracted helper is clearer — it make sense to use it.").correct).toBe(false);
  });
  it("requires both 'made' and 'need you to'", () => {
    const q = m09.items.find((q) => q.id === "M09-A10")!;
    expect(checkExercise(q, "We made a mistake in the counter — I need you to review again.").correct).toBe(true);
    expect(checkExercise(q, "We did a mistake in the counter — I need you to review again.").correct).toBe(false);
    expect(checkExercise(q, "We made a mistake in the counter — I need that you review again.").correct).toBe(false);
  });
});

describe("content/modules/M10/assessment.yaml", () => {
  const m10 = bundle.moduleAssessments["M10"]!;
  it("requires both 'doesn't work' and 'same as'", () => {
    const q = m10.items.find((q) => q.id === "M10-A02")!;
    expect(checkExercise(q, "It doesn't work after the rollback — it's the same bug as Monday.").correct).toBe(true);
    expect(checkExercise(q, "It not works after the rollback — it's the same bug as Monday.").correct).toBe(false);
    expect(checkExercise(q, "It doesn't work after the rollback — it's the same bug of Monday.").correct).toBe(false);
  });
  it("requires both 'after rolling' and 'need to verify'", () => {
    const q = m10.items.find((q) => q.id === "M10-A05")!;
    expect(checkExercise(q, "After rolling back, I need to verify if it's green.").correct).toBe(true);
    expect(checkExercise(q, "After to roll back, I need to verify if it's green.").correct).toBe(false);
    expect(checkExercise(q, "After rolling back, I need verify if it's green.").correct).toBe(false);
  });
  it("requires both 'roll back' and 'on my machine'", () => {
    const q = m10.items.find((q) => q.id === "M10-A06")!;
    expect(checkExercise(q, "I'll roll back the image — it works on my machine anyway.").correct).toBe(true);
    expect(checkExercise(q, "I'll revert the image — it works on my machine anyway.").correct).toBe(true);
    expect(checkExercise(q, "I'll revert back the image — it works on my machine anyway.").correct).toBe(false);
    expect(checkExercise(q, "I'll roll back the image — it works in my machine anyway.").correct).toBe(false);
  });
  it("requires both 'found' and 'led'", () => {
    const q = m10.items.find((q) => q.id === "M10-A07")!;
    expect(checkExercise(q, "We found the root cause — the bug led to all the timeouts.").correct).toBe(true);
    expect(checkExercise(q, "We finded the root cause — the bug led to all the timeouts.").correct).toBe(false);
    expect(checkExercise(q, "We found the root cause — the bug lead to all the timeouts.").correct).toBe(false);
  });
  it("requires both 'cheaper' and 'caught'", () => {
    const q = m10.items.find((q) => q.id === "M10-A10")!;
    expect(checkExercise(q, "The workaround is cheaper — I caught the 401s in the logs.").correct).toBe(true);
    expect(checkExercise(q, "The workaround is more cheap — I caught the 401s in the logs.").correct).toBe(false);
    expect(checkExercise(q, "The workaround is cheaper — I catched the 401s in the logs.").correct).toBe(false);
  });
});

describe("content/modules/M11/assessment.yaml", () => {
  const m11 = bundle.moduleAssessments["M11"]!;
  it("requires both 'depends on' and 'suggested that'", () => {
    const q = m11.items.find((q) => q.id === "M11-A02")!;
    expect(checkExercise(q, "The ramp depends on the metrics — Priya suggested that I wait an hour.").correct).toBe(true);
    expect(checkExercise(q, "The ramp depends in the metrics — Priya suggested that I wait an hour.").correct).toBe(false);
    expect(checkExercise(q, "The ramp depends on the metrics — Priya suggested me to wait an hour.").correct).toBe(false);
  });
  it("requires both 'succeeded' and 'doesn't pass'", () => {
    const q = m11.items.find((q) => q.id === "M11-A05")!;
    expect(checkExercise(q, "The deploy succeeded, but the health check doesn't pass.").correct).toBe(true);
    expect(checkExercise(q, "The deploy was succeeded, but the health check doesn't pass.").correct).toBe(false);
    expect(checkExercise(q, "The deploy succeeded, but the health check not passes.").correct).toBe(false);
  });
  it("requires both 'ran terraform apply' and 'same as'", () => {
    const q = m11.items.find((q) => q.id === "M11-A06")!;
    expect(checkExercise(q, "I ran terraform apply — it's the same setup as staging.").correct).toBe(true);
    expect(checkExercise(q, "I applied the changes — it's the same setup as staging.").correct).toBe(true);
    expect(checkExercise(q, "I applied the terraform — it's the same setup as staging.").correct).toBe(false);
    expect(checkExercise(q, "I ran terraform apply — it's the same setup of staging.").correct).toBe(false);
  });
  it("requires both 'before merging' and 'need you to'", () => {
    const q = m11.items.find((q) => q.id === "M11-A08")!;
    expect(checkExercise(q, "Before merging, I need you to check the plan.").correct).toBe(true);
    expect(checkExercise(q, "Before to merge, I need you to check the plan.").correct).toBe(false);
    expect(checkExercise(q, "Before merging, I need that you check the plan.").correct).toBe(false);
  });
  it("requires 'safer', 'chose' and 'cheaper'", () => {
    const q = m11.items.find((q) => q.id === "M11-A10")!;
    expect(checkExercise(q, "Blue/green is safer but we chose the canary — it's cheaper.").correct).toBe(true);
    expect(checkExercise(q, "Blue/green is more safe but we chose the canary — it's cheaper.").correct).toBe(false);
    expect(checkExercise(q, "Blue/green is safer but we choosed the canary — it's cheaper.").correct).toBe(false);
    expect(checkExercise(q, "Blue/green is safer but we chose the canary — it's more cheap.").correct).toBe(false);
  });
  it("requires both 'explain to me' and bare 'failed'", () => {
    const q = m11.items.find((q) => q.id === "M11-A12")!;
    expect(checkExercise(q, "Can you explain to me why the pipeline failed last night?").correct).toBe(true);
    expect(checkExercise(q, "Can you explain me why the pipeline failed last night?").correct).toBe(false);
    expect(checkExercise(q, "Can you explain to me why the pipeline did fail last night?").correct).toBe(false);
  });
});

describe("content/modules/M12/assessment.yaml", () => {
  const m12 = bundle.moduleAssessments["M12"]!;
  it("requires 'died/dead' and 'has been pending since'", () => {
    const q = m12.items.find((q) => q.id === "M12-A02")!;
    expect(checkExercise(q, "The pod died — it's been crash-looping since noon. Wait, no — it has been pending since 9am.").correct).toBe(true);
    expect(checkExercise(q, "The pod is died — it has been pending since 9am.").correct).toBe(false);
    expect(checkExercise(q, "The pod died — it is pending since 9am.").correct).toBe(false);
  });
  it("requires both 'need to see' and 'on the node'", () => {
    const q = m12.items.find((q) => q.id === "M12-A05")!;
    expect(checkExercise(q, "I need to see why the pod was scheduled on the node.").correct).toBe(true);
    expect(checkExercise(q, "I need see why the pod was scheduled on the node.").correct).toBe(false);
    expect(checkExercise(q, "I need to see why the pod was scheduled in the node.").correct).toBe(false);
  });
  it("requires both 'doesn't scale' and 'same as'", () => {
    const q = m12.items.find((q) => q.id === "M12-A06")!;
    expect(checkExercise(q, "The HPA doesn't scale on memory — it's the same config as the docs.").correct).toBe(true);
    expect(checkExercise(q, "The HPA not scales on memory — it's the same config as the docs.").correct).toBe(false);
    expect(checkExercise(q, "The HPA doesn't scale on memory — it's the same config of the docs.").correct).toBe(false);
  });
  it("requires both 'after bumping' and 'suggested that'", () => {
    const q = m12.items.find((q) => q.id === "M12-A08")!;
    expect(checkExercise(q, "After bumping the limit, Ana suggested that I watch the rollout.").correct).toBe(true);
    expect(checkExercise(q, "After to bump the limit, Ana suggested that I watch the rollout.").correct).toBe(false);
    expect(checkExercise(q, "After bumping the limit, Ana suggested me to watch the rollout.").correct).toBe(false);
  });
  it("requires both 'cheaper' and 'chose'", () => {
    const q = m12.items.find((q) => q.id === "M12-A10")!;
    expect(checkExercise(q, "The bigger node is cheaper — we chose it for the discount.").correct).toBe(true);
    expect(checkExercise(q, "The bigger node is more cheap — we chose it for the discount.").correct).toBe(false);
    expect(checkExercise(q, "The bigger node is cheaper — we choosed it for the discount.").correct).toBe(false);
  });
  it("requires both 'explain to me' and 'depends on'", () => {
    const q = m12.items.find((q) => q.id === "M12-A12")!;
    expect(checkExercise(q, "Can you explain to me why the HPA depends on CPU?").correct).toBe(true);
    expect(checkExercise(q, "Can you explain me why the HPA depends on CPU?").correct).toBe(false);
    expect(checkExercise(q, "Can you explain to me why the HPA depends in CPU?").correct).toBe(false);
  });
});

describe("M13 assessment variants", () => {
  const m13 = bundle.moduleAssessments["M13"]!;
  it("requires both 'look forward' and 'attached'", () => {
    const q = m13.items.find((q) => q.id === "M13-A02")!;
    expect(checkExercise(q, "I look forward to your reply — please find the spec attached.").correct).toBe(true);
    expect(checkExercise(q, "I wait your reply — please find the spec attached.").correct).toBe(false);
    expect(checkExercise(q, "I look forward to your reply — please find the spec in attachment.").correct).toBe(false);
  });
  it("requires both 'the delay' and 'regards'", () => {
    const q = m13.items.find((q) => q.id === "M13-A04")!;
    expect(checkExercise(q, "Sorry for the delay on the update. Best regards, Yuri").correct).toBe(true);
    expect(checkExercise(q, "Sorry for late on the update. Best regards, Yuri").correct).toBe(false);
    expect(checkExercise(q, "Sorry for the delay on the update. Best regrets, Yuri").correct).toBe(false);
  });
  it("requires both 'send me' and 'waiting for'", () => {
    const q = m13.items.find((q) => q.id === "M13-A06")!;
    expect(checkExercise(q, "Can you send me the report? I've been waiting for your answer since Monday.").correct).toBe(true);
    expect(checkExercise(q, "Can you send to me the report? I've been waiting for your answer since Monday.").correct).toBe(false);
    expect(checkExercise(q, "Can you send me the report? I'm waiting your answer since Monday.").correct).toBe(false);
  });
  it("requires 'doesn't work', 'returns' and singular 'information'", () => {
    const q = m13.items.find((q) => q.id === "M13-A08")!;
    expect(checkExercise(q, "The tool doesn't work — it returns the information raw.").correct).toBe(true);
    expect(checkExercise(q, "The tool not works — it returns the information raw.").correct).toBe(false);
    expect(checkExercise(q, "The tool doesn't work — it return the information raw.").correct).toBe(false);
    expect(checkExercise(q, "The tool doesn't work — it returns the informations raw.").correct).toBe(false);
  });
  it("requires 'told me', 'ask Marcos', 'question' and 'into main'", () => {
    const q = m13.items.find((q) => q.id === "M13-A12")!;
    expect(checkExercise(q, "She told me to ask Marcos — I have a question about the merge into main.").correct).toBe(true);
    expect(checkExercise(q, "She said me to ask Marcos — I have a question about the merge into main.").correct).toBe(false);
    expect(checkExercise(q, "She told me to ask to Marcos — I have a question about the merge into main.").correct).toBe(false);
    expect(checkExercise(q, "She told me to ask Marcos — I have a doubt about the merge into main.").correct).toBe(false);
    expect(checkExercise(q, "She told me to ask Marcos — I have a question about the merge in main.").correct).toBe(false);
  });
  it("requires 'closer', 'need you to', 'on the channel' and 'ask a question'", () => {
    const q = m13.items.find((q) => q.id === "M13-A15")!;
    expect(checkExercise(q, "The deadline is closer — I need you to listen on the channel and ask a question if it stalls.").correct).toBe(true);
    expect(checkExercise(q, "The deadline is more close — I need you to listen on the channel and ask a question if it stalls.").correct).toBe(false);
    expect(checkExercise(q, "The deadline is closer — I need that you listen on the channel and ask a question if it stalls.").correct).toBe(false);
    expect(checkExercise(q, "The deadline is closer — I need you to listen in the channel and ask a question if it stalls.").correct).toBe(false);
    expect(checkExercise(q, "The deadline is closer — I need you to listen on the channel and make a question if it stalls.").correct).toBe(false);
  });
});

describe("M14 assessment variants", () => {
  const m14 = bundle.moduleAssessments["M14"]!;
  it("requires both 'provision' and 'in the cloud'", () => {
    const q = m14.items.find((q) => q.id === "M14-A02")!;
    expect(checkExercise(q, "Terraform will provision the env in the cloud.").correct).toBe(true);
    expect(checkExercise(q, "Terraform will provisionate the env in the cloud.").correct).toBe(false);
    expect(checkExercise(q, "Terraform will provision the env on the cloud.").correct).toBe(false);
  });
  it("requires 'recommends migrating' and 'to Azure'", () => {
    const q = m14.items.find((q) => q.id === "M14-A04")!;
    expect(checkExercise(q, "The team recommends migrating to Azure next quarter.").correct).toBe(true);
    expect(checkExercise(q, "The team recommends to migrate to Azure next quarter.").correct).toBe(false);
    expect(checkExercise(q, "The team recommends migrating for Azure next quarter.").correct).toBe(false);
  });
  it("requires both 'depends on' and 'same as'", () => {
    const q = m14.items.find((q) => q.id === "M14-A06")!;
    expect(checkExercise(q, "It depends on the workload — it's the same issue as yesterday.").correct).toBe(true);
    expect(checkExercise(q, "It depends of the workload — it's the same issue as yesterday.").correct).toBe(false);
    expect(checkExercise(q, "It depends on the workload — it's the same issue of yesterday.").correct).toBe(false);
  });
  it("requires both 'doesn't cover' and 'is per region'", () => {
    const q = m14.items.find((q) => q.id === "M14-A08")!;
    expect(checkExercise(q, "The SLA doesn't cover maintenance — the quota is per region.").correct).toBe(true);
    expect(checkExercise(q, "The SLA not covers maintenance — the quota is per region.").correct).toBe(false);
    expect(checkExercise(q, "The SLA doesn't cover maintenance — the quota it's per region.").correct).toBe(false);
  });
  it("requires 'suggested that', 'ask Ana' and 'question'", () => {
    const q = m14.items.find((q) => q.id === "M14-A10")!;
    expect(checkExercise(q, "She suggested that I ask Ana — I have a question about the SLA.").correct).toBe(true);
    expect(checkExercise(q, "She suggested me to ask Ana — I have a question about the SLA.").correct).toBe(false);
    expect(checkExercise(q, "She suggested that I ask to Ana — I have a question about the SLA.").correct).toBe(false);
    expect(checkExercise(q, "She suggested that I ask Ana — I have a doubt about the SLA.").correct).toBe(false);
  });
  it("requires 'plan/intend' and 'by Friday'", () => {
    const q = m14.items.find((q) => q.id === "M14-A13")!;
    expect(checkExercise(q, "I plan to file the quota increase by Friday.").correct).toBe(true);
    expect(checkExercise(q, "I pretend to file the quota increase by Friday.").correct).toBe(false);
    expect(checkExercise(q, "I plan to file the quota increase until Friday.").correct).toBe(false);
  });
  it("requires 'told me' and 'cheaper'", () => {
    const q = m14.items.find((q) => q.id === "M14-A15")!;
    expect(checkExercise(q, "She told me egress is cheaper than ingress at our volume.").correct).toBe(true);
    expect(checkExercise(q, "She said me egress is cheaper than ingress at our volume.").correct).toBe(false);
    expect(checkExercise(q, "She told me egress is more cheap than ingress at our volume.").correct).toBe(false);
  });
});
