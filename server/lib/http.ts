import type { IncomingMessage, ServerResponse } from "node:http";
import { serverConfig } from "./config";

export type ApiReq = {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | undefined>;
  body: unknown;
  rawBody: string;
  ip: string;
};

export type ApiRes = {
  status: (code: number) => ApiRes;
  json: (body: unknown) => void;
  send: (body: string | Buffer) => void;
  setHeader: (name: string, value: string) => void;
};

export function applyCors(req: ApiReq, res: ApiRes): boolean {
  const originHeader = header(req, "origin");
  const allowed = serverConfig.frontendOrigins;
  const origin =
    originHeader && allowed.includes(originHeader)
      ? originHeader
      : allowed.length === 1
        ? allowed[0]
        : "";

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Stripe-Signature");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

export function header(req: ApiReq, name: string): string {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function clientIp(req: ApiReq): string {
  const forwarded = header(req, "x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.ip || "unknown";
}

export function readNodeRaw(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function fromNode(req: IncomingMessage, rawBody: string, url: URL): ApiReq {
  const body = rawBody && headerLike(req, "content-type").includes("application/json")
    ? safeJson(rawBody)
    : {};
  return {
    method: req.method ?? "GET",
    headers: req.headers,
    query: Object.fromEntries(url.searchParams.entries()),
    body,
    rawBody,
    ip: req.socket.remoteAddress ?? "unknown",
  };
}

function headerLike(req: IncomingMessage, name: string): string {
  const value = req.headers[name];
  return Array.isArray(value) ? value.join(",") : (value ?? "");
}

export function wrapNodeRes(res: ServerResponse): ApiRes {
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
      res.statusCode = statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
    },
    send(body) {
      res.statusCode = statusCode;
      res.end(body);
    },
  };
}

export function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function methodGuard(req: ApiReq, res: ApiRes, methods: string[]): boolean {
  if (!methods.includes(req.method)) {
    res.status(405).json({ error: "Method not allowed" });
    return false;
  }
  return true;
}
