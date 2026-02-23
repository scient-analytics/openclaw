import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { createToolCallHandler } from "./tool-handlers.js";

// Minimal KBManager stub
function createMockKb() {
  const docs: Record<string, Array<{ id: string; title: string; text: string }>> = {
    skills: [
      { id: "sk1", title: "Skill: sync-to-michael/sync", text: "# Sync Skill\nContent here" },
      { id: "sk2", title: "Skill: debugging", text: "# Debugging\nSteps" },
    ],
    organization: [
      { id: "org1", title: "Person: Matt", text: "# Matt\nFounder" },
      { id: "org2", title: "Agent: michael", text: "# Michael Agent Config" },
    ],
  };

  return {
    list: async (collection: string) => docs[collection] ?? [],
    read: async (docId: string) => {
      for (const collection of Object.values(docs)) {
        const doc = collection.find((d) => d.id === docId);
        if (doc) return doc;
      }
      throw new Error("Document not found");
    },
    search: async (query: string, collection?: string) => {
      const pool = collection ? (docs[collection] ?? []) : Object.values(docs).flat();
      return pool
        .filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))
        .map((d) => ({ document: d, context: "", ranking: 1 }));
    },
  };
}

describe("MCP Tool Handlers", () => {
  let handler: ReturnType<typeof createToolCallHandler>;
  let lastHookPayload: string | undefined;

  beforeEach(() => {
    lastHookPayload = undefined;
    handler = createToolCallHandler({
      kb: createMockKb() as never,
      sendToAgent: async (message: string) => {
        lastHookPayload = message;
        return { ok: true, runId: "run-1" };
      },
    });
  });

  it("michael_list_skills returns skill names", async () => {
    const result = await handler("michael_list_skills", {});
    const text = result.content[0].text;
    assert.ok(text.includes("sync-to-michael/sync"));
    assert.ok(text.includes("debugging"));
  });

  it("michael_pull_skill returns skill content", async () => {
    const result = await handler("michael_pull_skill", { name: "sync-to-michael/sync" });
    const text = result.content[0].text;
    assert.ok(text.includes("# Sync Skill"));
  });

  it("michael_pull_skill returns error for unknown skill", async () => {
    const result = await handler("michael_pull_skill", { name: "nonexistent" });
    assert.ok(result.isError);
  });

  it("michael_list_agents returns agent names", async () => {
    const result = await handler("michael_list_agents", {});
    const text = result.content[0].text;
    assert.ok(text.includes("michael"));
  });

  it("michael_sync sends payload to agent", async () => {
    const result = await handler("michael_sync", { payload: "test sync data" });
    assert.ok(lastHookPayload?.includes("test sync data"));
    assert.ok(!result.isError);
  });

  it("michael_ask sends question to agent", async () => {
    const result = await handler("michael_ask", { question: "What projects are active?" });
    assert.ok(lastHookPayload?.includes("What projects are active?"));
    assert.ok(!result.isError);
  });

  it("michael_pull_agent returns agent content", async () => {
    const result = await handler("michael_pull_agent", { name: "michael" });
    const text = result.content[0].text;
    assert.ok(text.includes("# Michael Agent Config"));
  });

  it("unknown tool returns error", async () => {
    const result = await handler("nonexistent_tool", {});
    assert.ok(result.isError);
  });
});
