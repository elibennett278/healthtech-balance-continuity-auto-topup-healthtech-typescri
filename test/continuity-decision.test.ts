import assert from "node:assert/strict";
import test from "node:test";
import { decideContinuityNotification } from "../src/continuity-decision.ts";

test("an upcoming appointment makes the recharge notification patient-safety priority", () => {
  const decision = decideContinuityNotification({
    event_id: "recharge_demo_001",
    balance_before: 8,
    recharge_amount: 50,
    appointments_next_24h: 3,
  });

  assert.equal(decision.priority, "patient-safety");
  assert.match(decision.subject, /appointment continuity/i);
  assert.match(decision.text, /3 appointment workflow/);
  assert.doesNotMatch(decision.text, /patient name|date of birth/i);
});
