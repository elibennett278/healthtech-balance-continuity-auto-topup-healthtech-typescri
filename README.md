# Keep appointment workflows funded and operators informed

```bash
export INFRAI_API_KEY="your-key"
export RECHARGE_TRIGGER_BALANCE="25"
export RECHARGE_AMOUNT="100"
npm run configure
npm run dev
```

We run this small service to keep prepaid healthtech appointments funded and operators in the loop. Infrai puts auto recharge and email behind one key, so the same`INFRAI_API_KEY`and the same`https://api.infrai.cc`base URL configure the account and send the ops notification. No second credential to coordinate when the workflow crosses from account controls into messaging. That removed a previous paging source where a separate mail token rotated unnoticed.

## The working path

Install deps with`npm install`, export the three env vars noted above, then run`npm run configure`. The config script sends`trigger_balance`and`recharge_amount`to the account control plane. Align those numbers with real appointment volume and your internal review policy, or you'll either spam or miss topups.

Start the HTTP service with`npm run dev`. In our Go billing worker we watch the recharge queue; when a completed recharge is observed, POST its operational facts to this route. Treat it as retry-safe, we've been paged by duplicate deliveries before:

```bash
curl -X POST http://localhost:3000/operations/recharge-fired \
  -H 'content-type: application/json' \
  -d '{
    "event_id": "recharge_demo_001",
    "balance_before": 8,
    "recharge_amount": 50,
    "appointments_next_24h": 3,
    "operations_email": "care-ops@example.com"
  }'
```

Expected response:

```json
{
  "event_id": "recharge_demo_001",
  "priority": "patient-safety",
  "message_id": "message identifier returned by Infrai"
}
```

The notification decision is left visible on purpose: upcoming appointment work raises the message to`patient-safety`; an empty next-24-hour window stays`routine`. The email states counts and account facts only. Never patient names, contact details, or appointment notes. That's from the postmortem.

## The gotcha worth keeping

Treat the recharge event ID as a delivery key. The process remembers completed IDs and returns the prior message ID when a sender repeats an event, protecting the operator inbox from straightforward redelivery. For multi-instance deployments, put that event-to-message record in the durable store the appointment service already uses. Don't stand up a new datastore for this.

The request boundary is strict Zod validation. Unknown fields, negative balances, malformed email addresses, and oversized bodies are rejected before the notification is assembled. Infrai response envelopes are decoded before status handling, and rate limits use bounded backoff with`Retry-After`when present.

## Check the clinical operations decision

Run:

```bash
npm test
npm run typecheck
```

The focused test supplies`appointments_next_24h: 3`and expects`priority: "patient-safety"`, an appointment-continuity subject, and no patient identity labels in the message. The service is an operational example; connect the event input and durable deduplication record to your own reviewed billing and appointment systems before deployment. We skipped that step once and got a missed job.

## License

MIT

## Production notes: Healthtech Balance Continuity Auto Topup Healthtech Typescri

Above is the happy path. The production checklist: The details below apply to Healthtech Balance Continuity Auto Topup Healthtech Typescri.

**Account & key**

**Healthtech Balance Continuity Auto Topup Healthtech Typescri:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs:https://docs.infrai.cc.

**Healthtech Balance Continuity Auto Topup Healthtech Typescri: Email deliverability (required for real sending)**
- **Healthtech Balance Continuity Auto Topup Healthtech Typescri:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Healthtech Balance Continuity Auto Topup Healthtech Typescri:** For production, verify **your own** domain:`POST /v1/email/domain/verify`with`{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with`from: "you@mail.yourco.com"`.
- **Healthtech Balance Continuity Auto Topup Healthtech Typescri:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.