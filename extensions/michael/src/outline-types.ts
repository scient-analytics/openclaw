export interface OutlineCollection {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  permission: "read" | "read_write" | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutlineDocument {
  id: string;
  title: string;
  text: string;
  collectionId: string;
  parentDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  url: string;
}

export interface OutlineSearchResult {
  context: string;
  ranking: number;
  document: OutlineDocument;
}

export interface OutlinePagination {
  limit: number;
  offset: number;
  nextPath: string | null;
}
