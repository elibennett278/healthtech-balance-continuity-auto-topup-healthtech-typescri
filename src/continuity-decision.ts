export type RechargeEvent = {
  event_id: string;
  balance_before: number;
  recharge_amount: number;
  appointments_next_24h: number;
};

export type ContinuityDecision = {
  priority: "routine" | "patient-safety";
  subject: string;
  text: string;
};

export function decideContinuityNotification(event: RechargeEvent): ContinuityDecision {
  const priority = event.appointments_next_24h > 0 ? "patient-safety" : "routine";
  const appointmentLine = event.appointments_next_24h > 0
    ? `${event.appointments_next_24h} appointment workflow(s) are scheduled in the next 24 hours.`
    : "No appointment workflows are scheduled in the next 24 hours.";

  return {
    priority,
    subject: priority === "patient-safety"
      ? "Auto recharge completed: appointment continuity check"
      : "Auto recharge completed",
    text: [
      `Operational event ${event.event_id} completed.`,
      `Balance before recharge: ${event.balance_before}.`,
      `Recharge amount: ${event.recharge_amount}.`,
      appointmentLine,
      "No patient-identifying data is included in this notification.",
    ].join("\n"),
  };
}
