import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleWebhook } from "../server/lib/handlers";
import { fromVercel, wrapVercel } from "../server/lib/vercel";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await handleWebhook(await fromVercel(req), wrapVercel(res));
}
