import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleHealth } from "../server/lib/handlers";
import { fromVercel, wrapVercel } from "../server/lib/vercel";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await handleHealth(await fromVercel(req), wrapVercel(res));
}
