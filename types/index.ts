export type LLMProvider = "openai" | "google";
export type EmbeddingProvider = "openai" | "google";

export interface DocumentMeta {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  totalChunks: number;
  ownerId: string;
  embeddingProvider: EmbeddingProvider;
  embeddingModel: string;
  uploadedAt: string;
}

export interface ChatSource {
  documentId: string;
  fileName: string;
  chunkIndex: number;
  content: string;
  score: number;
}

export type ChatMode = "chat" | "sql-agent";

export interface AgentStep {
  tool: string;
  input: string;
  result: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  steps?: AgentStep[];
}

export interface ModelOption {
  id: string;
  name: string;
}

export type ModelsMap = Record<string, ModelOption[]>;

// --- Graph Types ---

export interface GraphNode {
  id: string;
  label: string;
  type: "document" | "chunk" | "table";
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RelatedDocument {
  documentId: string;
  fileName: string;
  score: number;
  connectionCount: number;
}
