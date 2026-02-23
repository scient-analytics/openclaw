import assert from "node:assert";
import { describe, it } from "node:test";
import { MCP_TOOLS } from "./tools.js";

describe("MCP Tool Definitions", () => {
  it("exports all expected tools", () => {
    const names = MCP_TOOLS.map((t) => t.name);
    assert.ok(names.includes("michael_sync"));
    assert.ok(names.includes("michael_ask"));
    assert.ok(names.includes("michael_list_skills"));
    assert.ok(names.includes("michael_pull_skill"));
    assert.ok(names.includes("michael_list_agents"));
    assert.ok(names.includes("michael_pull_agent"));
  });

  it("all tools have valid schemas", () => {
    for (const tool of MCP_TOOLS) {
      assert.ok(tool.name, "tool must have name");
      assert.ok(tool.description, "tool must have description");
      assert.ok(tool.inputSchema, "tool must have inputSchema");
      assert.strictEqual(tool.inputSchema.type, "object");
    }
  });
});
