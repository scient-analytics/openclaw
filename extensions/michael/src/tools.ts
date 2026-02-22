import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { KBManager, CollectionKey } from "./kb-manager.js";

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

export function registerOutlineTools(api: OpenClawPluginApi, kb: KBManager) {
  // 1. outline_search
  api.registerTool({
    name: "outline_search",
    label: "Outline Search",
    description:
      "Search the Outline knowledge base. Returns matching documents with titles and snippets.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      collection: Type.Optional(
        Type.String({
          description:
            "Collection to search in (organization, okrs, brain, projects, sources, workstreams, digest). Omit to search all.",
        }),
      ),
    }),
    async execute(_id, params) {
      const p = params as { query: string; collection?: string };
      try {
        const results = await kb.search(p.query, p.collection as CollectionKey | undefined);
        return json(results);
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : String(err) });
      }
    },
  });

  // 2. outline_read
  api.registerTool({
    name: "outline_read",
    label: "Outline Read",
    description:
      "Read a document from the Outline knowledge base by its ID. Returns the full document with title and markdown content.",
    parameters: Type.Object({
      document_id: Type.String({ description: "Document ID to read" }),
    }),
    async execute(_id, params) {
      const p = params as { document_id: string };
      try {
        const doc = await kb.read(p.document_id);
        return json(doc);
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : String(err) });
      }
    },
  });

  // 3. outline_write
  api.registerTool({
    name: "outline_write",
    label: "Outline Write",
    description: "Create a new document in an Outline collection. Use this to store new knowledge.",
    parameters: Type.Object({
      collection: Type.String({
        description:
          "Collection to write to (organization, okrs, brain, projects, sources, workstreams, digest)",
      }),
      title: Type.String({ description: "Document title" }),
      content: Type.String({ description: "Markdown content" }),
    }),
    async execute(_id, params) {
      const p = params as { collection: string; title: string; content: string };
      try {
        const doc = await kb.write(p.collection as CollectionKey, p.title, p.content);
        return json({ id: doc.id, title: doc.title, url: doc.url });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : String(err) });
      }
    },
  });

  // 4. outline_update
  api.registerTool({
    name: "outline_update",
    label: "Outline Update",
    description:
      "Update an existing document in the Outline knowledge base. Use mode 'append' to add content or 'replace' to overwrite.",
    parameters: Type.Object({
      document_id: Type.String({ description: "Document ID to update" }),
      content: Type.String({ description: "New markdown content" }),
      mode: Type.Optional(
        Type.Union([Type.Literal("replace"), Type.Literal("append")], {
          description: "Update mode: replace (default) or append",
          default: "replace",
        }),
      ),
    }),
    async execute(_id, params) {
      const p = params as { document_id: string; content: string; mode?: "replace" | "append" };
      try {
        const doc = await kb.update(p.document_id, p.content, p.mode === "append");
        return json({ id: doc.id, title: doc.title });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : String(err) });
      }
    },
  });

  // 5. outline_list
  api.registerTool({
    name: "outline_list",
    label: "Outline List",
    description: "List all documents in an Outline collection. Returns document titles and IDs.",
    parameters: Type.Object({
      collection: Type.String({
        description:
          "Collection to list (organization, okrs, brain, projects, sources, workstreams, digest)",
      }),
    }),
    async execute(_id, params) {
      const p = params as { collection: string };
      try {
        const docs = await kb.list(p.collection as CollectionKey);
        return json(docs);
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : String(err) });
      }
    },
  });
}
