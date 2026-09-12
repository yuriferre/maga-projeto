import { describe, it, expect } from "vitest";
import { detectBrErrors } from "../shared/br-detector.ts";
import { loadContent } from "../shared/content-loader.ts";

const patterns = loadContent("content").brErrors;
const tagsOf = (text: string) => detectBrErrors(text, patterns).map((f) => f.tag);

describe("detectBrErrors", () => {
  it("flags 'I have a doubt'", () => {
    expect(tagsOf("I have a doubt about the runner.")).toContain("br.doubt");
  });
  it("flags present continuous + since", () => {
    expect(tagsOf("I'm working on this since yesterday.")).toContain("br.since-present");
    expect(tagsOf("I am working on this since Monday")).toContain("br.since-present");
  });
  it("does NOT flag the correct present perfect + since", () => {
    expect(tagsOf("I've been working on this since yesterday.")).not.toContain("br.since-present");
  });
  it("flags 'until' used as a deadline after finish/done", () => {
    expect(tagsOf("I will finish it until Friday.")).toContain("br.until-by");
    expect(tagsOf("I'll be working on it until Friday.")).not.toContain("br.until-by");
  });
  it("flags 'giving error'", () => {
    expect(tagsOf("The job is giving error again")).toContain("br.giving-error");
  });
  it("flags 'waiting the'", () => {
    expect(tagsOf("I'm waiting the review")).toContain("br.waiting-no-prep");
    expect(tagsOf("I'm waiting on the review")).not.toContain("br.waiting-no-prep");
  });
  it("flags 'explain me'", () => {
    expect(tagsOf("Can you explain me the setup?")).toContain("br.explain-me");
  });
  it("flags 'pretend to' and 'assist the meeting'", () => {
    expect(tagsOf("I pretend to finish today")).toContain("br.pretend");
    expect(tagsOf("I will assist the meeting")).toContain("br.assist");
  });
  it("returns findings ordered by index with match text", () => {
    const findings = detectBrErrors("I have a doubt. It's giving error.", patterns);
    expect(findings.map((f) => f.tag)).toEqual(["br.doubt", "br.giving-error"]);
    expect(findings[0]!.match.toLowerCase()).toContain("doubt");
    expect(findings[0]!.index).toBeLessThan(findings[1]!.index);
  });
  it("returns an empty array for clean text", () => {
    expect(detectBrErrors("I've been working on this since Monday and I'm blocked on access.", patterns)).toEqual([]);
  });
  it("does not flag ordinary correct English (false-positive guard)", () => {
    const clean = [
      "I have some doubts about this migration plan.",
      "I am changing my approach since it's cleaner.",
      "I won't be done until Friday.",
      "I borrowed his laptop; I'll have it until Friday.",
      "I'm just waiting a minute for the kettle.",
      "The kids pretended to be pirates all afternoon.",
      "Actually I'm not sure that's right.",
      "In the last week we shipped two releases.",
      "I have 10 years of experience in software development.",
      "She wins money every time she plays the lottery.",
      "The signal is bad, I'm losing the call.",
      "I've been waiting a long time for the review.",
      "I was waiting a full hour.",
      "The number of people is growing.",
      "The list of people is long.",
      "Can you explain them?",
      "I lost the meeting notes.",
      "It gives an error when the token expires.",
      "We have 3 years left.",
      "I'm going to do it since Monday's meeting was cancelled.",
      "The office is open until late.",
    ];
    for (const s of clean) expect(detectBrErrors(s, patterns), s).toEqual([]);
  });
  it.each([
    "I stayed until late to fix it.",
    "I worked until late last night.",
    "We were working until late in the evening.",
  ])("does not flag valid until late usage: %s", (sentence) => {
    // A antiga asserção positiva confundia preferência por concisão com erro gramatical.
    expect(detectBrErrors(sentence, patterns)).toEqual([]);
  });
  it("flags 'do/did + modal' only as the calque", () => {
    expect(tagsOf("Do you can check the logs?")).toContain("br.do-modal");
    expect(tagsOf("Did you could reproduce it?")).toContain("br.do-modal");
    expect(tagsOf("Doesn't she can approve it?")).toContain("br.do-modal");
    expect(tagsOf("Do you have a minute?")).not.toContain("br.do-modal");
    expect(tagsOf("Do you think you can check the logs?")).not.toContain("br.do-modal");
    expect(tagsOf("I don't think it can wait.")).not.toContain("br.do-modal");
  });
  it("flags 'sorry for interrupt' but not the -ing or to-forms", () => {
    expect(tagsOf("Sorry for interrupt.")).toContain("br.sorry-for-interrupt");
    expect(tagsOf("Sorry for jump in.")).toContain("br.sorry-for-interrupt");
    expect(tagsOf("Sorry to interrupt.")).not.toContain("br.sorry-for-interrupt");
    expect(tagsOf("Sorry for interrupting.")).not.toContain("br.sorry-for-interrupt");
    expect(tagsOf("Sorry for the interruption.")).not.toContain("br.sorry-for-interrupt");
  });
  it("flags 'need that you' as the 'preciso que você' calque", () => {
    expect(tagsOf("I need that you check the config.")).toContain("br.need-that-you");
    expect(tagsOf("I need you to check the config.")).not.toContain("br.need-that-you");
    expect(tagsOf("I need that file. You can check the rest.")).not.toContain("br.need-that-you");
  });
  it("flags do/did + past-tense forms only", () => {
    expect(tagsOf("I didn't understood the error.")).toContain("br.did-past");
    expect(tagsOf("Did you tried a restart?")).toContain("br.did-past");
    expect(tagsOf("She doesn't knew about it.")).toContain("br.did-past");
    const clean = [
      "Did you try a restart?",
      "It worked.",
      "I don't need anything else.",
      "Do you feed the alerts into the dashboard?",
      "Did you read the runbook?",
      "Did you found the company before joining?",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.did-past");
  });
  it("flags 'actually' used as 'currently' only with an explicit present-time context", () => {
    expect(tagsOf("Actually I'm working at a bank now.")).toContain("br.actually");
    expect(tagsOf("Actually we are using Terraform these days.")).toContain("br.actually");
    expect(tagsOf("I actually work at Nubank nowadays.")).toContain("br.actually");
  });
  it("does NOT flag the correct uses of 'actually' or of 'depend on'", () => {
    const clean = [
      "Actually I'm not sure that's right.",
      "Actually, yeah, Marcos can pair with me.",
      "It's actually working now.",
      "Actually I finished it yesterday.",
      "It depends on the runner.",
      "The dependency of the module is outdated.",
      "Actually I am running low on time, but currently we are blocked.",
      "Actually, I am thinking about it, currently leaning yes.",
      "Actually he is joking, currently nobody believes him.",
    ];
    for (const s of clean) expect(detectBrErrors(s, patterns), s).toEqual([]);
    expect(tagsOf("It depends of the runner.")).toContain("br.depend-of");
  });
  it("flags 'said me' but not 'told me' or 'said to me'", () => {
    expect(tagsOf("She said me to check the logs.")).toContain("br.said-me");
    expect(tagsOf("Marcos says me the freeze starts tomorrow.")).toContain("br.said-me");
    expect(tagsOf("She told me to check the logs.")).not.toContain("br.said-me");
    expect(tagsOf("He said to me the fix was live.")).not.toContain("br.said-me");
    expect(tagsOf("He said, 'me too'.")).not.toContain("br.said-me");
    expect(tagsOf("What did she say? Me, I think it's fine.")).not.toContain("br.said-me");
  });
  it("flags 'ask to + pronoun' only", () => {
    expect(tagsOf("Ask to him about the freeze.")).toContain("br.ask-to");
    expect(tagsOf("You can ask to her in the thread.")).toContain("br.ask-to");
    expect(tagsOf("Ask him about the freeze.")).not.toContain("br.ask-to");
    expect(tagsOf("Ask to join the huddle.")).not.toContain("br.ask-to");
    expect(tagsOf("May I ask you to check?")).not.toContain("br.ask-to");
  });
  it("flags preposition + 'next <period>' but not possessives", () => {
    expect(tagsOf("The deploy is on next week.")).toContain("br.on-next");
    expect(tagsOf("I'll pick this up in next Monday.")).toContain("br.on-next");
    expect(tagsOf("I'll pick this up next week.")).not.toContain("br.on-next");
    expect(tagsOf("Let's review it in next week's planning.")).not.toContain("br.on-next");
    expect(tagsOf("See you on the next call.")).not.toContain("br.on-next");
  });
  it("flags 'send to me the X' word-order calque only", () => {
    expect(tagsOf("Can you send to me the runbook?")).toContain("br.send-to-me");
    expect(tagsOf("She forwarded to me the thread.")).toContain("br.send-to-me");
    expect(tagsOf("Send me the runbook.")).not.toContain("br.send-to-me");
    expect(tagsOf("Send the runbook to me.")).not.toContain("br.send-to-me");
    expect(tagsOf("She replied to me.")).not.toContain("br.send-to-me");
  });
  it("flags 'for to' but not legitimate 'for' or 'to' sequences", () => {
    expect(tagsOf("I read the doc for to find the flag.")).toContain("br.for-to");
    expect(tagsOf("I checked the log for to see the error.")).toContain("br.for-to");
    expect(tagsOf("For me, to read logs is the hard part.")).not.toContain("br.for-to");
    expect(tagsOf("I bought it for two dollars.")).not.toContain("br.for-to");
    expect(tagsOf("She works for TOTVS.")).not.toContain("br.for-to");
  });
  it("flags wrong -ed forms of irregular verbs only", () => {
    expect(tagsOf("I readed the error message.")).toContain("br.irregular-past");
    expect(tagsOf("We finded the root cause in the trace.")).toContain("br.irregular-past");
    expect(tagsOf("He thinked the flag was deprecated.")).toContain("br.irregular-past");
    const clean = [
      "I read the log yesterday.",
      "We seeded the database before the test.",
      "She needed more time to read the RFC.",
      "They agreed on the rollout plan.",
      "He sawed through the branch with a hand saw.",
      "The batter flied out to center field.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.irregular-past");
  });
  it("flags 'more + -er adjective' calques only", () => {
    expect(tagsOf("This doc is more easy to read.")).toContain("br.more-er");
    expect(tagsOf("The new UI is more fast.")).toContain("br.more-er");
    const clean = [
      "This doc is easier to read.",
      "The new UI is faster.",
      "It is more detailed than the old one.",
      "It is more or less the same.",
      "We need more specific examples.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.more-er");
  });
  it("flags 'in the internet' but not attributive 'internet' uses", () => {
    expect(tagsOf("I found the workaround in the internet.")).toContain("br.in-the-internet");
    expect(tagsOf("On the internet nobody knows.")).not.toContain("br.in-the-internet");
    expect(tagsOf("In the internet age, docs are online.")).not.toContain("br.in-the-internet");
    expect(tagsOf("I found it online.")).not.toContain("br.in-the-internet");
  });
  it("flags 'didn't saw' and 'had a doubt' after the catalog extensions", () => {
    expect(tagsOf("I didn't saw your comment on the issue.")).toContain("br.did-past");
    expect(tagsOf("I had a doubt about the chart.")).toContain("br.doubt");
    expect(tagsOf("I saw your comment.")).not.toContain("br.did-past");
    expect(tagsOf("I had doubts about his story.")).not.toContain("br.doubt");
  });
  it("flags 'listen in port' but not 'listen on' or 'listen in on'", () => {
    expect(tagsOf("The service listens in port 8080.")).toContain("br.listen-in");
    expect(tagsOf("It listens in the interface.")).toContain("br.listen-in");
    expect(tagsOf("The service listens on port 8080.")).not.toContain("br.listen-in");
    expect(tagsOf("I'd like to listen in on the call.")).not.toContain("br.listen-in");
  });
  it("flags pluralized uncountable nouns only", () => {
    expect(tagsOf("The response returns the datas.")).toContain("br.uncountable");
    expect(tagsOf("Thanks for the feedbacks.")).toContain("br.uncountable");
    expect(tagsOf("We need more informations about the deploy.")).toContain("br.uncountable");
    const clean = [
      "The response returns the data.",
      "Thanks for the feedback.",
      "We need more information about the deploy.",
      "The equipment list is long.",
      "That software runs on every node.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.uncountable");
  });
  it("flags missing third-person -s on infra subjects only", () => {
    expect(tagsOf("The request go through the gateway.")).toContain("br.third-person-s");
    expect(tagsOf("This service talk to the database.")).toContain("br.third-person-s");
    expect(tagsOf("The load balancer route traffic to pods.")).toContain("br.third-person-s");
    const clean = [
      "The request goes through the gateway.",
      "The requests go through the gateway.",
      "The services talk to the database.",
      "The request can go through.",
      "I go through the gateway config.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.third-person-s");
  });
  it("flags 'arrive on/in + infra target' only", () => {
    expect(tagsOf("The request arrives on the server.")).toContain("br.arrive-on");
    expect(tagsOf("The packet arrived in the pod.")).toContain("br.arrive-on");
    const clean = [
      "The request arrives at the gateway.",
      "The request gets to the server.",
      "She arrives on time every day.",
      "He arrived in São Paulo last night.",
      "The plane arrives on the runway.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.arrive-on");
  });
  it("flags 'steps for reproduce' but not 'steps to reproduce'", () => {
    expect(tagsOf("Add steps for reproduce the bug.")).toContain("br.steps-for");
    expect(tagsOf("The ticket needs steps for reproducing it.")).toContain("br.steps-for");
    const clean = [
      "Add steps to reproduce the bug.",
      "The steps for the deploy are in the wiki.",
      "Three steps for a clean build.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.steps-for");
  });
  it("flags 'verify if' but not 'check whether' or bare 'verify'", () => {
    expect(tagsOf("Please verify if the fix works.")).toContain("br.verify-if");
    expect(tagsOf("Can you verify if the pod is up?")).toContain("br.verify-if");
    const clean = [
      "Please check whether the fix works.",
      "Please check if the fix works.",
      "Please verify the fix before merging.",
      "Verify the signature before deploying.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.verify-if");
  });
  it("flags 'merge in <branch>' but not 'merge into' or 'merge in the changes'", () => {
    expect(tagsOf("Merge the PR in main.")).toContain("br.merge-in");
    expect(tagsOf("We merged it in develop yesterday.")).toContain("br.merge-in");
    const clean = [
      "Merge the PR into main.",
      "We merged it into develop.",
      "Merge in the latest changes from main.",
      "The fix was merged last week.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.merge-in");
  });
  it("flags 'revert back' but not bare 'revert'", () => {
    expect(tagsOf("We should revert back the deploy.")).toContain("br.revert-back");
    expect(tagsOf("It was reverted back to v1.2.")).toContain("br.revert-back");
    const clean = [
      "We should revert the deploy.",
      "It was reverted to v1.2.",
      "We rolled back the deploy.",
      "Go back to the previous version.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.revert-back");
  });
  it("flags 'estimative' but not 'estimate/estimation'", () => {
    expect(tagsOf("My estimative is 3 story points.")).toContain("br.estimative");
    expect(tagsOf("The estimatives were off.")).toContain("br.estimative");
    const clean = [
      "My estimate is 3 story points.",
      "The estimation session took an hour.",
      "I underestimated the work.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.estimative");
  });
  it("flags 'have a compromise' (compromisso) but not the real 'compromise'", () => {
    expect(tagsOf("I have a compromise at 3pm, can we move?")).toContain("br.compromise");
    expect(tagsOf("She has a compromise with the client.")).toContain("br.compromise");
    const clean = [
      "We reached a compromise on the scope.",
      "Security is not something we can compromise.",
      "Let's compromise between speed and quality.",
      "It's a fair compromise.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.compromise");
  });
  it("flags 'if + will' at a clause start but not 'if' meaning whether", () => {
    expect(tagsOf("If we will need more nodes, the cost goes up.")).toContain("br.if-will");
    expect(tagsOf("If it will rain, the demo moves indoors.")).toContain("br.if-will");
    const clean = [
      "If we need more nodes, the cost goes up.",
      "I don't know if it will work.",
      "Can you check if the job will run tonight?",
      "Tell me if they will join.",
      "If it works, we ship it.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.if-will");
  });
  it("flags 'it/this/that make sense' without -s", () => {
    expect(tagsOf("It make sense to split the epic.")).toContain("br.it-makes-sense");
    expect(tagsOf("That make sense?")).toContain("br.it-makes-sense");
    const clean = [
      "It makes sense to split the epic.",
      "Does it make sense?",
      "The changes that make it safer are small.",
      "Make sense of the data first.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.it-makes-sense");
  });
  it("still flags the narrowed calques", () => {
    expect(tagsOf("Any doubts?")).toContain("br.doubt");
    expect(tagsOf("I have 30 years.")).toContain("br.have-years");
    expect(tagsOf("I will be ready until Friday.")).toContain("br.until-by");
    expect(tagsOf("I want to win a good salary.")).toContain("br.win-money");
    expect(tagsOf("We lost the deadline again.")).toContain("br.lose-the-deadline");
    expect(tagsOf("I'm waiting you in the call.")).toContain("br.waiting-no-prep");
    expect(tagsOf("We pretend to deploy on Friday.")).toContain("br.pretend");
  });
  it("flags 'team moral' (morale) but not moral as ethics", () => {
    expect(tagsOf("The team moral is low after the incident.")).toContain("br.morale");
    expect(tagsOf("Our group moral improved after the retro.")).toContain("br.morale");
    const clean = [
      "The moral of the story is: test restores.",
      "Moral support matters in a crisis.",
      "The team morale is low after the incident.",
      "A moral dilemma, not a technical one.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.morale");
  });
  it("flags 'do a mistake' but not 'make a mistake'", () => {
    expect(tagsOf("We did a mistake in the last deploy.")).toContain("br.do-mistake");
    expect(tagsOf("I did a mistake — let me fix it.")).toContain("br.do-mistake");
    const clean = [
      "We made a mistake in the last deploy.",
      "The mistake we did the analysis on was mine.",
      "Do your best, mistakes happen.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.do-mistake");
  });
  it("flags first-person '-ing' feelings (I'm boring) but not legit uses", () => {
    expect(tagsOf("I'm boring in these long meetings.")).toContain("br.ed-ing");
    expect(tagsOf("I am frustrating with the flaky tests.")).toContain("br.ed-ing");
    const clean = [
      "I'm bored in these long meetings.",
      "They're annoying, honestly.",
      "I'm interested in the topic.",
      "The talk was boring.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.ed-ing");
  });
  it("flags 'a feedback' (uncountable) but not 'a feedback loop'", () => {
    expect(tagsOf("She gave me a feedback about my presentation.")).toContain("br.uncountable");
    expect(tagsOf("I got another feedback yesterday.")).toContain("br.uncountable");
    const clean = [
      "The system has a feedback loop.",
      "That feedback signal is noisy.",
      "She gave me some feedback about my presentation.",
      "The feedback was useful.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.uncountable");
  });

  // M09: code review
  it("flags 'did a comment' but not valid review verbs", () => {
    expect(tagsOf("I did a comment on your PR.")).toContain("br.did-comment");
    expect(tagsOf("She does a comment on every line.")).toContain("br.did-comment");
    const clean = [
      "I left a comment on your PR.",
      "He made a comment about the weather.",
      "I did a review of the change.",
      "She added a comment in the thread.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.did-comment");
  });
  it("flags 'seems me' but not 'seems to me' or 'seems tired'", () => {
    expect(tagsOf("The code seems me fine.")).toContain("br.seems-me");
    expect(tagsOf("It seems me wrong to skip tests.")).toContain("br.seems-me");
    const clean = [
      "The code seems fine to me.",
      "It seems to me we should wait.",
      "He seems tired after the on-call.",
      "It seems fine.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.seems-me");
  });
  it("flags 'according to me' but not 'according to the docs'", () => {
    expect(tagsOf("According to me, we should revert.")).toContain("br.according-to-me");
    expect(tagsOf("According to me this refactor is risky.")).toContain("br.according-to-me");
    const clean = [
      "According to the docs, retries are on.",
      "In my view, we should revert.",
      "I think we should revert.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.according-to-me");
  });
  it("flags 'it worths' but not 'worth it'", () => {
    expect(tagsOf("It worths the refactor.")).toContain("br.worths");
    expect(tagsOf("The change worths a second look.")).toContain("br.worths");
    const clean = [
      "It's worth the refactor.",
      "The change is worth a second look.",
      "Worth doing, in my view.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.worths");
  });

  // M10: troubleshooting
  it("flags 'it not works' (missing doesn't) but not legit negatives", () => {
    expect(tagsOf("It not works on staging.")).toContain("br.it-not-works");
    expect(tagsOf("The job not fails anymore.")).toContain("br.it-not-works");
    const clean = [
      "It doesn't work on staging.",
      "It is not working yet.",
      "It's not broken, it's a feature.",
      "It was not fine yesterday.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.it-not-works");
  });
  it("flags 'after to reproduce' (gerund after preposition)", () => {
    expect(tagsOf("After to reproduce the bug, I checked the logs.")).toContain("br.after-to");
    expect(tagsOf("Roll back before to investigate.")).toContain("br.after-to");
    expect(tagsOf("It fails without to retry.")).toContain("br.after-to");
    const clean = [
      "After reproducing the bug, I checked the logs.",
      "Roll back before investigating.",
      "The key to fixing it is the lock.",
      "A way to fix it exists.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.after-to");
  });
  it("flags 'the same problem of' but not 'same kind of'", () => {
    expect(tagsOf("It's the same problem of yesterday.")).toContain("br.same-of");
    expect(tagsOf("Same error of last week.")).toContain("br.same-of");
    const clean = [
      "It's the same problem as yesterday.",
      "The same kind of error came back.",
      "Same as before.",
      "A different problem this time.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.same-of");
  });
  it("flags 'works in my machine' but not 'machine learning'", () => {
    expect(tagsOf("It works in my machine, weird.")).toContain("br.in-my-machine");
    expect(tagsOf("The test passes in my machine.")).toContain("br.in-my-machine");
    const clean = [
      "It works on my machine.",
      "It runs in my VM, not on the host.",
      "The model fails in my machine learning pipeline.",
      "Works fine locally.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.in-my-machine");
  });

  // M11: CI/CD e IaC
  it("flags 'depends in' but not 'depends in part'", () => {
    expect(tagsOf("The rollout depends in the flag.")).toContain("br.depends-in");
    expect(tagsOf("It depends in the region.")).toContain("br.depends-in");
    const clean = [
      "It depends on the flag.",
      "The rollout depends in part on the flag.",
      "It depends in part.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.depends-in");
  });
  it("flags 'suggested me to' but not 'suggested to me'", () => {
    expect(tagsOf("Ana suggested me to add a gate.")).toContain("br.suggested-me");
    expect(tagsOf("He suggested us to wait.")).toContain("br.suggested-me");
    const clean = [
      "Ana suggested to me that we add a gate.",
      "She suggested a gate.",
      "Ana suggested that I add a gate.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.suggested-me");
  });
  it("flags 'apply the terraform' but not the command order", () => {
    expect(tagsOf("I applied the terraform this morning.")).toContain("br.apply-terraform");
    expect(tagsOf("Let's apply terraform on staging.")).toContain("br.apply-terraform");
    const clean = [
      "Run terraform apply on staging.",
      "Terraform apply finished.",
      "Apply the changes after the plan.",
      "Review the terraform plan first.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.apply-terraform");
  });
  it("flags 'was succeeded' but not 'was succeeded by'", () => {
    expect(tagsOf("The deploy was succeeded after the fix.")).toContain("br.was-succeeded");
    expect(tagsOf("The rollout was happened yesterday.")).toContain("br.was-succeeded");
    const clean = [
      "The deploy succeeded after the fix.",
      "He was succeeded by his replacement.",
      "It has succeeded three times.",
      "The rollout happened yesterday.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.was-succeeded");
  });
});

describe("padrões BR — M12 (Kubernetes)", () => {
  it("flags 'the pod is pending since' but not 'has been'", () => {
    expect(tagsOf("The pod is pending since 9am.")).toContain("br.is-ing-since");
    expect(tagsOf("The job is running since Monday.")).toContain("br.is-ing-since");
    const clean = [
      "The pod has been pending since 9am.",
      "The pod has been running since Monday.",
      "The pods were pending all morning.",
      "The pod is pending.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.is-ing-since");
  });
  it("flags 'the pod is died' but not 'died' or 'is dead'", () => {
    expect(tagsOf("The pod is died — check the logs.")).toContain("br.is-died");
    expect(tagsOf("The node was died overnight.")).toContain("br.is-died");
    const clean = [
      "The pod died overnight.",
      "The pod is dead.",
      "The process died on startup.",
      "It was dead by morning.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.is-died");
  });
  it("flags 'need see' but not 'need to see' or 'need the logs'", () => {
    expect(tagsOf("I need see the pod logs.")).toContain("br.need-see");
    expect(tagsOf("We need restart the deployment.")).toContain("br.need-see");
    const clean = [
      "I need to see the pod logs.",
      "I need the logs.",
      "We need a restart.",
      "They need to verify the fix.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.need-see");
  });
  it("flags 'scheduled in the node' but not 'node pool'", () => {
    expect(tagsOf("The pod is scheduled in the node.")).toContain("br.in-the-node");
    expect(tagsOf("It runs in the node.")).toContain("br.in-the-node");
    const clean = [
      "The pod is scheduled on the node.",
      "It runs on the node.",
      "The pods run in the node pool.",
      "Scheduled in the node group.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.in-the-node");
  });
});

describe("padrões BR — M13 (e-mail e docs)", () => {
  it("flags 'in attachment' but not 'in the attachment'", () => {
    expect(tagsOf("Please find the report in attachment.")).toContain("br.in-attachment");
    expect(tagsOf("The logs are in attachment.")).toContain("br.in-attachment");
    const clean = [
      "Please find the report attached.",
      "See the attached file.",
      "The details are in the attachment.",
      "Attached is the runbook.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.in-attachment");
  });
  it("flags 'best regrets'", () => {
    expect(tagsOf("Best regrets, Yuri")).toContain("br.best-regrets");
    const clean = [
      "Best regards, Yuri",
      "Kind regards,",
      "No regrets about the deploy.",
      "Best, Ana",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.best-regrets");
  });
  it("flags 'I wait your reply' but not 'I await' or 'wait for'", () => {
    expect(tagsOf("I wait your reply to proceed.")).toContain("br.i-wait-reply");
    expect(tagsOf("I wait the confirmation.")).toContain("br.i-wait-reply");
    const clean = [
      "I await your reply.",
      "I'll wait for your reply.",
      "I look forward to your reply.",
      "I can't wait to hear back.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.i-wait-reply");
  });
  it("flags 'sorry for late' but not 'sorry for the late reply'", () => {
    expect(tagsOf("Sorry for late — the deploy took longer.")).toContain("br.sorry-for-late");
    expect(tagsOf("Sorry about late on the update.")).toContain("br.sorry-for-late");
    const clean = [
      "Sorry for the delay.",
      "Sorry I'm late.",
      "Sorry for the late reply.",
      "Sorry for being late.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.sorry-for-late");
  });

  it("flags 'on the cloud' but not 'on the cloud provider'", () => {
    expect(tagsOf("The service runs on the cloud.")).toContain("br.on-the-cloud");
    expect(tagsOf("We host everything on the cloud now.")).toContain("br.on-the-cloud");
    const clean = [
      "The service runs in the cloud.",
      "It runs on the cloud provider's platform.",
      "It's on the cloud platform we chose.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.on-the-cloud");
  });
  it("flags 'provisionate' but not 'provision'", () => {
    expect(tagsOf("Terraform will provisionate the VM.")).toContain("br.provisionate");
    expect(tagsOf("It provisionated the cluster yesterday.")).toContain("br.provisionate");
    const clean = [
      "Terraform will provision the VM.",
      "Provisioning is automated.",
      "The provisioned cluster is ready.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.provisionate");
  });
  it("flags 'migrate for AWS' but not 'migrate to AWS' or 'migrate for pricing'", () => {
    expect(tagsOf("We want to migrate for AWS next quarter.")).toContain("br.migrate-for");
    expect(tagsOf("The migration for GCP is planned.")).toContain("br.migrate-for");
    const clean = [
      "We want to migrate to AWS next quarter.",
      "The migration to GCP is planned.",
      "We migrate for better pricing, not for the brand.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.migrate-for");
  });
  it("flags 'recommend to use' but not 'recommend to the team'", () => {
    expect(tagsOf("I recommend to use spot instances.")).toContain("br.recommend-to");
    expect(tagsOf("She recommends to deploy on GCP.")).toContain("br.recommend-to");
    const clean = [
      "I recommend using spot instances.",
      "I recommend to the team that we use spot instances.",
      "She recommended AWS to us.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.recommend-to");
  });

  it("flags 'in this moment' as a calque of 'neste momento'", () => {
    expect(tagsOf("In this moment we are investigating the cause.")).toContain("br.in-this-moment");
    expect(tagsOf("We are investigating in this moment.")).toContain("br.in-this-moment");
    const clean = [
      "At this moment we are investigating the cause.",
      "Right now we are investigating.",
      "We are investigating right now.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.in-this-moment");
  });
  it("flags 'thanks for the patience' but not 'your patience'", () => {
    expect(tagsOf("Thanks for the patience — more news at 4pm.")).toContain("br.thanks-patience");
    expect(tagsOf("Thank you for the patience while we fix this.")).toContain("br.thanks-patience");
    const clean = [
      "Thanks for your patience — more news at 4pm.",
      "Thank you for bearing with us.",
      "Thanks for the quick response.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.thanks-patience");
  });
  it("flags 'as soon possible' missing 'as'", () => {
    expect(tagsOf("We'll update you as soon possible.")).toContain("br.asap-missing-as");
    expect(tagsOf("Fix it as soon possible, please.")).toContain("br.asap-missing-as");
    const clean = [
      "We'll update you as soon as possible.",
      "As soon as we know more, we'll post.",
      "Do it soon, please.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.asap-missing-as");
  });
  it("flags 'the service normalized' but not 'we normalized the data'", () => {
    expect(tagsOf("The service normalized after the rollback.")).toContain("br.normalized");
    expect(tagsOf("Traffic has normalized since the fix.")).toContain("br.normalized");
    const clean = [
      "The service recovered after the rollback.",
      "We normalized the data before the import.",
      "Latency is back to normal.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.normalized");
  });
});
