import { describe, it } from "node:test";
import assert from "node:assert";
import { createHmac } from "node:crypto";
import { createOutlineWebhookHandler } from "./webhook.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";

function mockReq(method: string, body: string, signature?: string): IncomingMessage {
  const readable = Readable.from([body]) as unknown as IncomingMessage;
  readable.method = method;
  readable.headers = signature ? { "outline-signature": signature } : {};
  readable.url = "/outline-webhook";
  return readable;
}

function mockRes(): { statusCode: number; body: string; end: (b?: string) => void } {
  return { statusCode: 0, body: "", end(b?: string) { this.body = b ?? ""; } };
}

describe("Outline Webhook Handler", () => {
  const secret = "test-secret-key";

  it("rejects non-POST requests", async () => {
    const handler = createOutlineWebhookHandler({ secret, onEvent: () => {} });
    const res = mockRes();
    await handler(mockReq("GET", ""), res as unknown as ServerResponse);
    assert.strictEqual(res.statusCode, 405);
  });

  it("rejects missing signature", async () => {
    const handler = createOutlineWebhookHandler({ secret, onEvent: () => {} });
    const res = mockRes();
    await handler(mockReq("POST", "{}"), res as unknown as ServerResponse);
    assert.strictEqual(res.statusCode, 401);
  });

  it("rejects invalid signature", async () => {
    const handler = createOutlineWebhookHandler({ secret, onEvent: () => {} });
    const res = mockRes();
    await handler(mockReq("POST", "{}", "wrong-signature"), res as unknown as ServerResponse);
    assert.strictEqual(res.statusCode, 401);
  });

  it("accepts valid signature and fires event", async () => {
    let firedEvent = "";
    const handler = createOutlineWebhookHandler({
      secret,
      onEvent: (event) => { firedEvent = event; },
    });

    const body = JSON.stringify({
      id: "delivery-1",
      actorId: "user-1",
      webhookSubscriptionId: "sub-1",
      createdAt: new Date().toISOString(),
      event: "documents.update",
      payload: { id: "doc-1", model: { title: "Test Doc" } },
    });
    const sig = createHmac("sha256", secret).update(body).digest("hex");

    const res = mockRes();
    await handler(mockReq("POST", body, sig), res as unknown as ServerResponse);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(firedEvent, "documents.update");
  });

  it("rejects invalid JSON with valid signature", async () => {
    const handler = createOutlineWebhookHandler({ secret, onEvent: () => {} });
    const body = "not-json";
    const sig = createHmac("sha256", secret).update(body).digest("hex");

    const res = mockRes();
    await handler(mockReq("POST", body, sig), res as unknown as ServerResponse);
    assert.strictEqual(res.statusCode, 400);
  });
});
