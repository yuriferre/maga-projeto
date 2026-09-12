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
