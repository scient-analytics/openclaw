import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";

const plugin = {
  id: "michael",
  name: "Michael",
  description: "Outline wiki KB + coordinator agent",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    api.logger.info("Michael plugin registered");
  },
};

export default plugin;
