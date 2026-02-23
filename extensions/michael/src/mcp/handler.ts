import type { IncomingMessage, ServerResponse } from "node:http";

export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type McpToolResult = {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
};

export type McpHandlerOptions = {
  authToken: string;
  tools: McpToolDefinition[];
  onToolCall: (name: string, args: unknown) => Promise<McpToolResult>;
};

type JsonRpcRequest = {
  jsonrpc: string;
  id?: number | string;
  method: string;
  params?: unknown;
};

export function createMcpHandler(opts: McpHandlerOptions) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method not allowed");
      return;
    }

    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token || token !== opts.authToken) {
      res.statusCode = 401;
      res.end("Unauthorized");
      return;
    }

    const body = await readBody(req);
    let rpc: JsonRpcRequest;
    try {
      rpc = JSON.parse(body) as JsonRpcRequest;
    } catch {
      sendJsonRpc(res, { error: { code: -32700, message: "Parse error" } });
      return;
    }

    if (rpc.id === undefined) {
      res.statusCode = 202;
      res.end();
      return;
    }

    switch (rpc.method) {
      case "initialize":
        sendJsonRpc(res, {
          id: rpc.id,
          result: {
            protocolVersion: "2025-03-26",
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: "michael", version: "0.1.0" },
          },
        });
        break;

      case "tools/list":
        sendJsonRpc(res, {
          id: rpc.id,
          result: { tools: opts.tools },
        });
        break;

      case "tools/call": {
        const params = rpc.params as { name: string; arguments?: unknown } | undefined;
        if (!params?.name) {
          sendJsonRpc(res, {
            id: rpc.id,
            error: { code: -32602, message: "Invalid params: missing tool name" },
          });
          break;
        }
        const tool = opts.tools.find((t) => t.name === params.name);
        if (!tool) {
          sendJsonRpc(res, {
            id: rpc.id,
            error: { code: -32602, message: `Unknown tool: ${params.name}` },
          });
          break;
        }
        try {
          const result = await opts.onToolCall(params.name, params.arguments ?? {});
          sendJsonRpc(res, { id: rpc.id, result });
        } catch (err) {
          sendJsonRpc(res, {
            id: rpc.id,
            result: {
              content: [
                {
                  type: "text",
                  text: `Error: ${err instanceof Error ? err.message : String(err)}`,
                },
              ],
              isError: true,
            },
          });
        }
        break;
      }

      default:
        sendJsonRpc(res, {
          id: rpc.id,
          error: { code: -32601, message: `Method not found: ${rpc.method}` },
        });
    }
  };
}

function sendJsonRpc(res: ServerResponse, body: Record<string, unknown>): void {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ jsonrpc: "2.0", ...body }));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
    setTimeout(() => reject(new Error("Body read timeout")), 5000);
  });
}
