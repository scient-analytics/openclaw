import type { McpToolDefinition } from "./handler.js";

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "michael_sync",
    description:
      "Send a structured session report to Michael (team coordinator). The payload should be a formatted sync report including: goal, tools/skills used, key outcomes, skills to share, and good practice notes.",
    inputSchema: {
      type: "object",
      properties: {
        payload: { type: "string", description: "The full sync report text" },
      },
      required: ["payload"],
    },
  },
  {
    name: "michael_ask",
    description:
      "Ask Michael a question and get his response. Use this to query the team knowledge base, ask for context about projects/people, or get Michael's opinion on something.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "The question to ask Michael" },
      },
      required: ["question"],
    },
  },
  {
    name: "michael_list_skills",
    description:
      "List all shared team skills stored in Michael's knowledge base. Returns skill names and IDs.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "michael_pull_skill",
    description:
      "Download a specific shared skill from Michael's knowledge base by name. Returns the full skill content (markdown).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Skill name (e.g. 'sync-to-michael/sync')" },
      },
      required: ["name"],
    },
  },
  {
    name: "michael_list_agents",
    description:
      "List all agent configurations stored in Michael's knowledge base. Returns agent names and IDs.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "michael_pull_agent",
    description:
      "Download a specific agent configuration from Michael's knowledge base by name. Returns the full agent config content.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Agent name (e.g. 'michael')" },
      },
      required: ["name"],
    },
  },
];
