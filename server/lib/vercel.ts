import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ApiReq, ApiRes } from "./http";
import { readNodeRaw, safeJson } from "./http.js";

export async function fromVercel(req: VercelRequest): Promise<ApiReq> {
  const method = req.method ?? "GET";
  const hasBody = req.body != null && req.body !== "";
  const rawBody = hasBody
    ? typeof req.body === "string"
      ? req.body
      : Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : JSON.stringify(req.body)
    : method === "GET" || method === "HEAD" || typeof req.on !== "function"
      ? ""
      : await readNodeRaw(req);

  const query: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(req.query ?? {})) {
    query[key] = Array.isArray(value) ? value[0] : value;
  }

  const forwarded = req.headers["x-forwarded-for"];
  const realIp = req.headers["x-real-ip"];
  const ip =
    (typeof realIp === "string" && realIp) ||
    (typeof forwarded === "string" ? forwarded.split(",")[0]!.trim() : "") ||
    req.socket?.remoteAddress ||
    "unknown";

  return {
    method,
    headers: req.headers ?? {},
    query,
    body: typeof req.body === "object" && req.body && !Buffer.isBuffer(req.body) ? req.body : safeJson(rawBody),
    rawBody,
    ip,
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
