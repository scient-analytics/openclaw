import { describe, it } from "node:test";
import assert from "node:assert";
import { OutlineClient } from "./outline-client.js";

const url = process.env.OUTLINE_API_URL;
const key = process.env.OUTLINE_API_KEY;
const skip = !url || !key;

describe("OutlineClient", () => {
  (skip ? it.skip : it)("can list collections", async () => {
    const client = new OutlineClient(url!, key!);
    const collections = await client.listCollections();
    assert.ok(Array.isArray(collections));
  });

  (skip ? it.skip : it)("can search documents", async () => {
    const client = new OutlineClient(url!, key!);
    const results = await client.search("test");
    assert.ok(Array.isArray(results));
  });
});
