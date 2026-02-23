import assert from "node:assert";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { describe, it } from "node:test";
import { createMcpHandler } from "./handler.js";

function mockReq(method: string, body: string, headers?: Record<string, string>): IncomingMessage {
  const readable = Readable.from([body]) as unknown as IncomingMessage;
  readable.method = method;
  readable.headers = headers ?? {};
  readable.url = "/mcp";
  return readable;
}

function mockRes(): {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
  setHeader(k: string, v: string): void;
  end(b?: string): void;
} {
  return {
    statusCode: 0,
    body: "",
    headers: {},
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    end(b?: string) {
      this.body = b ?? "";
    },
  };
}

describe("MCP Handler", () => {
  const handler = createMcpHandler({
    authToken: "test-token",
    tools: [],
    onToolCall: async () => ({ content: [{ type: "text", text: "ok" }] }),
  });

  it("rejects non-POST requests", async () => {
    const res = mockRes();
    await handler(mockReq("GET", ""), res as unknown as ServerResponse);
    assert.strictEqual(res.statusCode, 405);
  });

  it("rejects missing auth token", async () => {
    const res = mockRes();
    await handler(mockReq("POST", "{}"), res as unknown as ServerResponse);
    assert.strictEqual(res.statusCode, 401);
  });

  it("rejects invalid auth token", async () => {
    const res = mockRes();
    await handler(
      mockReq("POST", "{}", { authorization: "Bearer wrong" }),
      res as unknown as ServerResponse,
    );
    assert.strictEqual(res.statusCode, 401);
  });

  it("handles initialize method", async () => {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });
    const res = mockRes();
    await handler(
      mockReq("POST", body, { authorization: "Bearer test-token" }),
      res as unknown as ServerResponse,
    );
    assert.strictEqual(res.statusCode, 200);
    const parsed = JSON.parse(res.body);
    assert.strictEqual(parsed.result.protocolVersion, "2025-03-26");
    assert.ok(parsed.result.capabilities.tools);
    assert.strictEqual(parsed.result.serverInfo.name, "michael");
  });

  it("handles notifications/initialized with 202", async () => {
    const body = JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" });
    const res = mockRes();
    await handler(
      mockReq("POST", body, { authorization: "Bearer test-token" }),
      res as unknown as ServerResponse,
    );
    assert.strictEqual(res.statusCode, 202);
  });

  it("handles tools/list", async () => {
    const toolHandler = createMcpHandler({
      authToken: "test-token",
      tools: [
        {
          name: "michael_test",
          description: "A test tool",
          inputSchema: { type: "object", properties: {} },
        },
      ],
      onToolCall: async () => ({ content: [{ type: "text", text: "ok" }] }),
    });
    const body = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const res = mockRes();
    await toolHandler(
      mockReq("POST", body, { authorization: "Bearer test-token" }),
      res as unknown as ServerResponse,
    );
    assert.strictEqual(res.statusCode, 200);
    const parsed = JSON.parse(res.body);
    assert.strictEqual(parsed.result.tools.length, 1);
    assert.strictEqual(parsed.result.tools[0].name, "michael_test");
  });

  it("handles tools/call", async () => {
    const toolHandler = createMcpHandler({
      authToken: "test-token",
      tools: [
        {
          name: "michael_echo",
          description: "Echo",
          inputSchema: { type: "object", properties: { msg: { type: "string" } } },
        },
      ],
      onToolCall: async (name, args) => ({
        content: [{ type: "text", text: `echo: ${(args as { msg: string }).msg}` }],
      }),
    });
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "michael_echo", arguments: { msg: "hello" } },
    });
    const res = mockRes();
    await toolHandler(
      mockReq("POST", body, { authorization: "Bearer test-token" }),
      res as unknown as ServerResponse,
    );
    assert.strictEqual(res.statusCode, 200);
    const parsed = JSON.parse(res.body);
    assert.strictEqual(parsed.result.content[0].text, "echo: hello");
  });

  it("passes X-User header to onToolCall context", async () => {
    let capturedContext: { username?: string } | undefined;
    const toolHandler = createMcpHandler({
      authToken: "test-token",
      tools: [
        {
          name: "michael_echo",
          description: "Echo",
          inputSchema: { type: "object", properties: {} },
        },
      ],
      onToolCall: async (_name, _args, context) => {
        capturedContext = context;
        return { content: [{ type: "text", text: "ok" }] };
      },
    });
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: { name: "michael_echo", arguments: {} },
    });
    const res = mockRes();
    await toolHandler(
      mockReq("POST", body, { authorization: "Bearer test-token", "x-user": "matt" }),
      res as unknown as ServerResponse,
    );
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(capturedContext?.username, "matt");
  });

  it("passes undefined username when X-User header is missing", async () => {
    let capturedContext: { username?: string } | undefined;
    const toolHandler = createMcpHandler({
      authToken: "test-token",
      tools: [
        {
          name: "michael_echo",
          description: "Echo",
          inputSchema: { type: "object", properties: {} },
        },
      ],
      onToolCall: async (_name, _args, context) => {
        capturedContext = context;
        return { content: [{ type: "text", text: "ok" }] };
      },
    });
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 11,
      method: "tools/call",
      params: { name: "michael_echo", arguments: {} },
    });
    const res = mockRes();
    await toolHandler(
      mockReq("POST", body, { authorization: "Bearer test-token" }),
      res as unknown as ServerResponse,
    );
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(capturedContext?.username, undefined);
  });

  it("returns error for unknown method", async () => {
    const body = JSON.stringify({ jsonrpc: "2.0", id: 4, method: "unknown/method" });
    const res = mockRes();
    await handler(
      mockReq("POST", body, { authorization: "Bearer test-token" }),
      res as unknown as ServerResponse,
    );
    assert.strictEqual(res.statusCode, 200);
    const parsed = JSON.parse(res.body);
    assert.strictEqual(parsed.error.code, -32601);
  });

  it("returns error for unknown tool", async () => {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "nonexistent", arguments: {} },
    });
    const res = mockRes();
    await handler(
      mockReq("POST", body, { authorization: "Bearer test-token" }),
      res as unknown as ServerResponse,
    );
    assert.strictEqual(res.statusCode, 200);
    const parsed = JSON.parse(res.body);
    assert.ok(parsed.error);
  });

  it("rejects invalid JSON", async () => {
    const res = mockRes();
    await handler(
      mockReq("POST", "not-json", { authorization: "Bearer test-token" }),
      res as unknown as ServerResponse,
    );
    assert.strictEqual(res.statusCode, 200);
    const parsed = JSON.parse(res.body);
    assert.strictEqual(parsed.error.code, -32700);
  });
});
