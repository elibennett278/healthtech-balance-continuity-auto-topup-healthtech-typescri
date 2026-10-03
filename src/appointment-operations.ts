import { createServer } from "node:http";
import { z } from "zod";
import { decideContinuityNotification, type RechargeEvent } from "./continuity-decision.ts";
import { clientFromEnvironment, InfraiError } from "./infrai-client.ts";

const rechargeEventSchema = z.object({
  event_id: z.string().min(1).max(120),
  balance_before: z.number().nonnegative(),
  recharge_amount: z.number().positive(),
  appointments_next_24h: z.number().int().nonnegative(),
  operations_email: z.string().email(),
}).strict();

const infrai = clientFromEnvironment();
const deliveredEvents = new Map<string, string>();

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 32_768) throw new Error("Request body is too large");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function reply(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/operations/recharge-fired") {
    reply(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const input = rechargeEventSchema.parse(await readJson(request)) as RechargeEvent & {
      operations_email: string;
    };
    const priorMessageId = deliveredEvents.get(input.event_id);
    if (priorMessageId) {
      reply(response, 200, { event_id: input.event_id, message_id: priorMessageId, duplicate: true });
      return;
    }

    const decision = decideContinuityNotification(input);
    const sent = await infrai.sendEmail({
      to: input.operations_email,
      subject: decision.subject,
      body: decision.text,
    });
    deliveredEvents.set(input.event_id, sent.message_id);
    reply(response, 202, {
      event_id: input.event_id,
      priority: decision.priority,
      message_id: sent.message_id,
    });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      reply(response, 400, { error: "Invalid recharge event" });
    } else if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      reply(response, status, { error: error.code, message: error.message });
    } else {
      reply(response, 500, { error: "Notification could not be processed" });
    }
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Appointment operations listening on http://localhost:${port}`));
