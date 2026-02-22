import type {
  OutlineCollection,
  OutlineDocument,
  OutlineSearchResult,
} from "./outline-types.js";

export class OutlineClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  private async request<T>(endpoint: string, body: Record<string, unknown> = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Outline API error ${res.status}: ${text}`);
    }

    const json = await res.json() as { ok: boolean; data: T };
    if (!json.ok) {
      throw new Error(`Outline API returned ok=false`);
    }
    return json.data;
  }

  async createCollection(params: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    permission?: "read" | "read_write";
  }): Promise<OutlineCollection> {
    return this.request<OutlineCollection>("collections.create", params);
  }

  async listCollections(): Promise<OutlineCollection[]> {
    return this.request<OutlineCollection[]>("collections.list", {});
  }

  async getCollection(id: string): Promise<OutlineCollection> {
    return this.request<OutlineCollection>("collections.info", { id });
  }

  async deleteCollection(id: string): Promise<void> {
    await this.request("collections.delete", { id });
  }

  async createDocument(params: {
    title: string;
    text: string;
    collectionId: string;
    parentDocumentId?: string;
    publish?: boolean;
  }): Promise<OutlineDocument> {
    return this.request<OutlineDocument>("documents.create", params);
  }

  async getDocument(id: string): Promise<OutlineDocument> {
    return this.request<OutlineDocument>("documents.info", { id });
  }

  async updateDocument(id: string, params: {
    title?: string;
    text?: string;
    append?: boolean;
    publish?: boolean;
  }): Promise<OutlineDocument> {
    return this.request<OutlineDocument>("documents.update", { id, ...params });
  }

  async listDocuments(collectionId: string): Promise<OutlineDocument[]> {
    return this.request<OutlineDocument[]>("documents.list", { collectionId });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.request("documents.delete", { id });
  }

  async search(query: string, options?: {
    collectionId?: string;
    limit?: number;
    offset?: number;
  }): Promise<OutlineSearchResult[]> {
    return this.request<OutlineSearchResult[]>("documents.search", {
      query,
      ...options,
    });
  }
}
