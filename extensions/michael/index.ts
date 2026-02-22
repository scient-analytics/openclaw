import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { OutlineClient } from "./src/outline-client.js";
import { KBManager } from "./src/kb-manager.js";
import { registerOutlineTools } from "./src/tools.js";
import { createOutlineWebhookHandler } from "./src/webhook.js";

const michaelConfigSchema = {
  safeParse(value: unknown) {
    if (!value || typeof value !== "object") {
      return { success: false as const, error: { issues: [{ path: [], message: "config required" }] } };
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
      api.logger.warn(
        "Michael plugin: missing outlineApiUrl or outlineApiKey in plugin config",
      );
      return;
    }

    const client = new OutlineClient(outlineUrl, outlineKey);
    const kb = new KBManager(client);

    // Initialize collections in background
    kb.initialize().catch((err) => api.logger.warn(`KB init failed: ${err}`));

    registerOutlineTools(api, kb);
    api.logger.info("Michael plugin: Outline tools registered");

    const webhookSecret = (api.pluginConfig as Record<string, unknown>)?.outlineWebhookSecret as
      | string
      | undefined;
    if (webhookSecret) {
      const handler = createOutlineWebhookHandler({
        secret: webhookSecret,
        onEvent: (event, payload) => {
          const model = payload.payload.model as { title?: string };
          const title = model.title ?? "unknown";
          api.logger.info(`Outline webhook: ${event} — "${title}"`);
        },
      });

      api.registerHttpRoute({ path: "/outline-webhook", handler });
      api.logger.info("Michael plugin: Outline webhook registered at /outline-webhook");
    }
  },
};

export default plugin;
