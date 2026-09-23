import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleDemo } from "../server/lib/handlers.js";
import { fromVercel, wrapVercel } from "../server/lib/vercel.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await handleDemo(await fromVercel(req), wrapVercel(res));
}
