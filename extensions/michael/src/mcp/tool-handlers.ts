import type { KBManager } from "../kb-manager.js";
import type { McpToolResult } from "./handler.js";

export type ToolCallHandlerDeps = {
  kb: KBManager;
  sendToAgent: (message: string) => Promise<{ ok: boolean; runId?: string }>;
};

export function createToolCallHandler(deps: ToolCallHandlerDeps) {
  const { kb, sendToAgent } = deps;

  return async (name: string, args: unknown): Promise<McpToolResult> => {
    const params = args as Record<string, string>;

    switch (name) {
      case "michael_list_skills": {
        const docs = await kb.list("skills");
        const lines = docs.map((d) => `- ${d.title} (id: ${d.id})`).join("\n");
        return text(lines || "No skills found.");
      }

      case "michael_pull_skill": {
        const docs = await kb.list("skills");
        const match = docs.find((d) => d.title.toLowerCase().includes(params.name.toLowerCase()));
        if (!match) {
          return error(`Skill not found: ${params.name}`);
        }
        const full = await kb.read(match.id);
        return text(full.text);
      }

      case "michael_list_agents": {
        const docs = await kb.list("organization");
        const agents = docs.filter((d) => d.title.toLowerCase().startsWith("agent:"));
        const lines = agents.map((d) => `- ${d.title} (id: ${d.id})`).join("\n");
        return text(lines || "No agents found.");
      }

      case "michael_pull_agent": {
        const docs = await kb.list("organization");
        const match = docs.find(
          (d) =>
            d.title.toLowerCase().startsWith("agent:") &&
            d.title.toLowerCase().includes(params.name.toLowerCase()),
        );
        if (!match) {
          return error(`Agent not found: ${params.name}`);
        }
        const full = await kb.read(match.id);
        return text(full.text);
      }

      case "michael_sync": {
        const result = await sendToAgent(`[Claude Code Sync]\n\n${params.payload}`);
        if (!result.ok) {
          return error("Failed to send sync to Michael.");
        }
        return text(`Sync sent to Michael. Run ID: ${result.runId}`);
      }

      case "michael_ask": {
        const result = await sendToAgent(params.question);
        if (!result.ok) {
          return error("Failed to send question to Michael.");
        }
        return text(
          `Question sent to Michael. Run ID: ${result.runId}\n\nMichael will process this asynchronously. Check back with him later for the answer.`,
        );
      }

      default:
        return error(`Unknown tool: ${name}`);
    }
  };
}

function text(t: string): McpToolResult {
  return { content: [{ type: "text", text: t }] };
}

function error(msg: string): McpToolResult {
  return { content: [{ type: "text", text: msg }], isError: true };
}
