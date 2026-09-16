import express from "express";
import { serverConfig } from "./lib/config";
import {
  handleCheckout,
  handleConfig,
  handleConfirmUpi,
  handleDemo,
  handleHealth,
  handleReceipt,
  handleStats,
  handleWebhook,
} from "./lib/handlers";
import { fromNode, wrapNodeRes } from "./lib/http";

const app = express();
app.set("trust proxy", 1);

// Stripe needs the exact raw payload for signature verification.
app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body ?? "");
  const url = new URL(req.originalUrl, `http://${req.headers.host ?? "localhost"}`);
  const apiReq = fromNode(req, rawBody, url);
  apiReq.body = {};
  apiReq.rawBody = rawBody;
  await handleWebhook(apiReq, wrapNodeRes(res));
});

app.use(express.json({ limit: "32kb" }));

function route(
  method: "get" | "post",
  path: string,
  handler: typeof handleHealth,
) {
  app[method](path, async (req, res) => {
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
    const url = new URL(req.originalUrl, `http://${req.headers.host ?? "localhost"}`);
    const apiReq = fromNode(req, rawBody, url);
    apiReq.body = req.body;
    apiReq.ip = req.ip ?? apiReq.ip;
    await handler(apiReq, wrapNodeRes(res));
  });
}

route("get", "/api/health", handleHealth);
route("get", "/api/config", handleConfig);
route("get", "/api/stats", handleStats);
route("get", "/api/receipt", handleReceipt);
route("post", "/api/checkout", handleCheckout);
route("post", "/api/confirm-upi", handleConfirmUpi);
route("post", "/api/demo", handleDemo);

app.use((_req, res) => {
  res.status(404).json({ error: "Unknown $1 Only route." });
});

app.listen(serverConfig.port, () => {
  console.log(`$1 Only api · http://127.0.0.1:${serverConfig.port}`);
});
