import { z } from "zod";
import { clientFromEnvironment } from "../src/infrai-client.ts";

const configurationSchema = z.object({
  trigger_balance: z.coerce.number().positive(),
  recharge_amount: z.coerce.number().positive(),
}).strict();

const configuration = configurationSchema.parse({
  trigger_balance: process.env.RECHARGE_TRIGGER_BALANCE,
  recharge_amount: process.env.RECHARGE_AMOUNT,
}) as { trigger_balance: number; recharge_amount: number };

const result = await clientFromEnvironment().configureAutoRecharge(configuration);
console.log("Auto recharge configured", result);
