import { OutlineClient } from "./outline-client.js";
import type { OutlineDocument, OutlineSearchResult } from "./outline-types.js";

export const DEFAULT_COLLECTIONS = {
  organization: { name: "Organization", description: "Company info, team, decisions", icon: "\u{1F3E2}" },
  okrs: { name: "OKRs", description: "Objectives and key results", icon: "\u{1F3AF}" },
  brain: { name: "Brain", description: "Agent learnings, open questions", icon: "\u{1F9E0}" },
  projects: { name: "Projects", description: "Active projects, backlog", icon: "\u{1F4CB}" },
  sources: { name: "Sources", description: "External sources to watch", icon: "\u{1F517}" },
  workstreams: { name: "Workstreams", description: "Per-person work logs", icon: "\u{1F4CA}" },
  digest: { name: "Digest", description: "Daily/weekly synthesis", icon: "\u{1F4F0}" },
} as const;

export type CollectionKey = keyof typeof DEFAULT_COLLECTIONS;

export class KBManager {
  private collectionIds: Partial<Record<CollectionKey, string>> = {};

  constructor(private client: OutlineClient) {}

  async initialize(): Promise<void> {
    const existing = await this.client.listCollections();

    for (const [key, config] of Object.entries(DEFAULT_COLLECTIONS)) {
      const found = existing.find((c) => c.name === config.name);
      if (found) {
        this.collectionIds[key as CollectionKey] = found.id;
      } else {
        const created = await this.client.createCollection({
          name: config.name,
          icon: config.icon,
          description: config.description,
          permission: "read_write",
        });
        this.collectionIds[key as CollectionKey] = created.id;
      }
    }
  }

  getCollections(): Record<string, string> {
    return { ...this.collectionIds } as Record<string, string>;
  }

  private getCollectionId(key: CollectionKey): string {
    const id = this.collectionIds[key];
    if (!id) throw new Error(`Collection "${key}" not initialized. Call initialize() first.`);
    return id;
  }

  async write(
    collection: CollectionKey,
    title: string,
    content: string,
    parentDocumentId?: string,
  ): Promise<OutlineDocument> {
    return this.client.createDocument({
      title,
      text: content,
      collectionId: this.getCollectionId(collection),
      parentDocumentId,
      publish: true,
    });
  }

  async read(documentId: string): Promise<OutlineDocument> {
    return this.client.getDocument(documentId);
  }

  async update(documentId: string, content: string, append = false): Promise<OutlineDocument> {
    return this.client.updateDocument(documentId, { text: content, append });
  }

  async list(collection: CollectionKey): Promise<OutlineDocument[]> {
    return this.client.listDocuments(this.getCollectionId(collection));
  }

  async search(query: string, collection?: CollectionKey): Promise<OutlineSearchResult[]> {
    return this.client.search(query, {
      collectionId: collection ? this.getCollectionId(collection) : undefined,
    });
  }

  async teardown(): Promise<void> {
    for (const id of Object.values(this.collectionIds)) {
      if (id) {
        try {
          await this.client.deleteCollection(id);
        } catch {
          // ignore cleanup errors
        }
      }
    }
    this.collectionIds = {};
  }
}
