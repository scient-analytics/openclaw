import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

export interface OutlineWebhookPayload {
  id: string;
  actorId: string;
  webhookSubscriptionId: string;
  createdAt: string;
  event: string;
  payload: {
    id: string;
    model: Record<string, unknown>;
  };
}

export function createOutlineWebhookHandler(opts: {
  secret: string;
  ignoreActorId?: string;
  onEvent: (event: string, payload: OutlineWebhookPayload) => void;
}) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method not allowed");
      return;
    }

    const body = await readBody(req);

    // Verify HMAC-SHA256 signature
    const signature = req.headers["outline-signature"] as string;
    if (!signature || !verifySignature(body, signature, opts.secret)) {
      res.statusCode = 401;
      res.end("Invalid signature");
      return;
    }

    try {
      const payload = JSON.parse(body) as OutlineWebhookPayload;

      // Skip events caused by our own API key (prevents feedback loops)
      if (opts.ignoreActorId && payload.actorId === opts.ignoreActorId) {
        res.statusCode = 200;
        res.end("ok (self)");
        return;
      }

      opts.onEvent(payload.event, payload);
      res.statusCode = 200;
      res.end("ok");
    } catch {
      res.statusCode = 400;
      res.end("Invalid JSON");
    }
  };
}

function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
    setTimeout(() => reject(new Error("Body read timeout")), 5000);
  });
}
