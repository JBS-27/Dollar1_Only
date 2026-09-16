import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ApiReq, ApiRes } from "./http";
import { readNodeRaw, safeJson } from "./http";

export async function fromVercel(req: VercelRequest): Promise<ApiReq> {
  const rawBody =
    typeof req.body === "string"
      ? req.body
      : Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : req.body
          ? JSON.stringify(req.body)
          : await readNodeRaw(req);

  const query: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(req.query)) {
    query[key] = Array.isArray(value) ? value[0] : value;
  }

  return {
    method: req.method ?? "GET",
    headers: req.headers,
    query,
    body: typeof req.body === "object" && req.body && !Buffer.isBuffer(req.body) ? req.body : safeJson(rawBody),
    rawBody,
    ip:
      (typeof req.headers["x-real-ip"] === "string" && req.headers["x-real-ip"]) ||
      (typeof req.headers["x-forwarded-for"] === "string"
        ? req.headers["x-forwarded-for"].split(",")[0]!.trim()
        : req.socket.remoteAddress) ||
      "unknown",
  };
}

export function wrapVercel(res: VercelResponse): ApiRes {
  let statusCode = 200;
  return {
    status(code) {
      statusCode = code;
      return this;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    json(body) {
      res.status(statusCode).json(body);
    },
    send(body) {
      res.status(statusCode).send(body);
    },
  };
}
