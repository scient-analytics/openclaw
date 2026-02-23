import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { KBManager } from "./src/kb-manager.js";
import { createMcpHandler } from "./src/mcp/handler.js";
import { createToolCallHandler } from "./src/mcp/tool-handlers.js";
import { MCP_TOOLS } from "./src/mcp/tools.js";
import { OutlineClient } from "./src/outline-client.js";
import { registerOutlineTools } from "./src/tools.js";
import { createOutlineWebhookHandler } from "./src/webhook.js";

const michaelConfigSchema = {
  safeParse(value: unknown) {
    if (!value || typeof value !== "object") {
      return {
        success: false as const,
        error: { issues: [{ path: [], message: "config required" }] },
      };
    }
    const v = value as Record<string, unknown>;
    if (!v.outlineApiUrl || typeof v.outlineApiUrl !== "string") {
      return {
        success: false as const,
        error: { issues: [{ path: ["outlineApiUrl"], message: "required string" }] },
      };
    }
    if (!v.outlineApiKey || typeof v.outlineApiKey !== "string") {
      return {
        success: false as const,
        error: { issues: [{ path: ["outlineApiKey"], message: "required string" }] },
      };
    }
    // outlineWebhookSecret is optional
    return { success: true as const, data: value };
  },
  jsonSchema: {
    type: "object" as const,
    required: ["outlineApiUrl", "outlineApiKey"],
    properties: {
      outlineApiUrl: {
        type: "string",
        description: "Outline API base URL (e.g. https://outline.example.com/api)",
      },
      outlineApiKey: { type: "string", description: "Outline API key" },
      outlineWebhookSecret: {
        type: "string",
        description: "Secret for verifying Outline webhook signatures (optional)",
      },
    },
  },
};

function formatOutlineEvent(event: string, title: string): string | null {
  switch (event) {
    case "documents.create":
      return `[Outline] New document created: "${title}". Review for duplicates and naming conventions.`;
    case "documents.update":
      return `[Outline] Document updated: "${title}". Check if cross-references or connections need updating.`;
    case "documents.delete":
      return `[Outline] Document deleted: "${title}". Verify this was intentional and update any references.`;
    case "documents.move":
      return `[Outline] Document moved: "${title}". Verify it is in the correct collection.`;
    default:
      return null;
  }
}

const plugin = {
  id: "michael",
  name: "Michael",
  description: "Outline wiki KB + coordinator agent",
  configSchema: michaelConfigSchema,
  register(api: OpenClawPluginApi) {
    const outlineUrl = (api.pluginConfig as Record<string, unknown>)?.outlineApiUrl as
      | string
      | undefined;
    const outlineKey = (api.pluginConfig as Record<string, unknown>)?.outlineApiKey as
      | string
      | undefined;

    if (!outlineUrl || !outlineKey) {
      api.logger.warn("Michael plugin: missing outlineApiUrl or outlineApiKey in plugin config");
      return;
    }

    const client = new OutlineClient(outlineUrl, outlineKey);
    const kb = new KBManager(client);

    // Initialize collections in background
    kb.initialize().catch((err) => api.logger.warn(`KB init failed: ${err}`));

    registerOutlineTools(api, kb);
    api.logger.info("Michael plugin: Outline tools registered");

    // MCP Streamable HTTP endpoint
    const gatewayAuth = (api.config as { gateway?: { auth?: { token?: string } } })?.gateway?.auth;
    const gatewayToken = gatewayAuth?.token;
    if (gatewayToken) {
      const enqueue = api.runtime.system.enqueueSystemEvent;

      const toolCallHandler = createToolCallHandler({
        kb,
        sendToAgent: async (message: string, username?: string) => {
          const sessionKey = username ? `person:${username.toLowerCase()}` : "agent:michael:main";
          try {
            enqueue(message, { sessionKey });
            return { ok: true, runId: `mcp-${Date.now()}` };
          } catch (err) {
            api.logger.warn(`MCP sendToAgent failed: ${err}`);
            return { ok: false };
          }
        },
      });

      const mcpHandler = createMcpHandler({
        authToken: gatewayToken,
        tools: MCP_TOOLS,
        onToolCall: toolCallHandler,
      });

      api.registerHttpRoute({ path: "/mcp", handler: mcpHandler });
      api.logger.info("Michael plugin: MCP endpoint registered at /mcp");
    } else {
      api.logger.warn("Michael plugin: no gateway auth token, MCP endpoint not registered");
    }

    const webhookSecret = (api.pluginConfig as Record<string, unknown>)?.outlineWebhookSecret as
      | string
      | undefined;
    if (webhookSecret) {
      const enqueue = api.runtime.system.enqueueSystemEvent;
      const sessionKey = `agent:michael:main`;

      // Resolve our own Outline user ID to filter self-caused events
      let selfActorId: string | undefined;
      client
        .getAuthInfo()
        .then((info) => {
          selfActorId = info.user.id;
          api.logger.info(`Michael plugin: Outline user ID resolved (${selfActorId})`);
        })
        .catch((err) => api.logger.warn(`Could not resolve Outline user ID: ${err}`));

      const handler = createOutlineWebhookHandler({
        secret: webhookSecret,
        get ignoreActorId() {
          return selfActorId;
        },
        onEvent: (event, payload) => {
          const model = payload.payload.model as {
            title?: string;
            collectionId?: string;
          };
          const title = model.title ?? "unknown";
          api.logger.info(`Outline webhook: ${event} — "${title}"`);

          // Queue a system event so Michael sees the change on next heartbeat
          const description = formatOutlineEvent(event, title);
          if (description) {
            enqueue(description, { sessionKey });
          }
        },
      });

      api.registerHttpRoute({ path: "/outline-webhook", handler });
      api.logger.info("Michael plugin: Outline webhook registered at /outline-webhook");
    }
  },
};

export default plugin;
