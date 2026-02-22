import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { OutlineClient } from "./src/outline-client.js";
import { KBManager } from "./src/kb-manager.js";
import { registerOutlineTools } from "./src/tools.js";
import { createOutlineWebhookHandler } from "./src/webhook.js";

const plugin = {
  id: "michael",
  name: "Michael",
  description: "Outline wiki KB + coordinator agent",
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
