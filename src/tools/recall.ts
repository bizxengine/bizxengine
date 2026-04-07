import { BizXClient } from "../client.js";
import { ValidationError } from "../errors.js";

const MAX_QUERY_LENGTH = 2_000;
const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 20;

interface RawMemory {
  id?: string;
  memory_id?: string;
  text?: string;
  content?: string;
  score?: number;
  similarity?: number;
  importance?: number;
  category?: string;
  meta?: Record<string, unknown>;
}

interface RetrieveResponse {
  results?: RawMemory[];
  memories?: RawMemory[];
  items?: RawMemory[];
}

interface NormalizedMemory {
  id: string;
  text: string;
  score: number | null;
  importance: number | null;
}

function normalizeMemory(raw: RawMemory): NormalizedMemory {
  return {
    id: raw.memory_id || raw.id || "",
    text: raw.text || raw.content || "",
    score: raw.score ?? raw.similarity ?? null,
    importance: raw.importance ?? null,
  };
}

export async function recall(
  client: BizXClient,
  args: Record<string, unknown>
): Promise<string> {
  const raw = args.query;
  if (typeof raw !== "string") {
    throw new ValidationError("query is required and must be a string");
  }

  const query = raw.trim();
  if (query.length === 0) {
    throw new ValidationError("query must not be empty or whitespace-only");
  }
  if (query.length > MAX_QUERY_LENGTH) {
    throw new ValidationError(`query exceeds maximum length of ${MAX_QUERY_LENGTH} characters`);
  }

  let k = DEFAULT_TOP_K;
  if (args.top_k !== undefined) {
    k = typeof args.top_k === "number" ? args.top_k : parseInt(String(args.top_k), 10);
    if (isNaN(k) || k < 1 || k > MAX_TOP_K) {
      throw new ValidationError(`top_k must be between 1 and ${MAX_TOP_K}`);
    }
  }

  const result = await client.post<RetrieveResponse>("/v1/memory/retrieve", {
    query,
    top_k: k,
  });

  const rawMemories = result.results || result.memories || result.items || [];

  if (rawMemories.length === 0) {
    return "No relevant memories found.";
  }

  const memories = rawMemories.map(normalizeMemory);

  const lines = memories.map((m, i) => {
    const parts: string[] = [`${i + 1}. ${m.text}`];
    const meta: string[] = [];
    if (m.score !== null) meta.push(`relevance: ${(m.score * 100).toFixed(1)}%`);
    if (m.importance !== null) meta.push(`importance: ${m.importance}/10`);
    if (m.id) meta.push(`id: ${m.id}`);
    if (meta.length > 0) parts.push(`   (${meta.join(" | ")})`);
    return parts.join("\n");
  });

  return `Found ${memories.length} relevant memories:\n\n${lines.join("\n\n")}`;
}

export const recallTool = {
  name: "brain.recall",
  description:
    "Search and retrieve relevant memories from BizXEngine. Use before answering questions about user preferences, past decisions, project context, business facts, or prior conversations. Returns the most relevant stored memory context.",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "The search query (max 2,000 characters)",
        maxLength: MAX_QUERY_LENGTH,
      },
      top_k: {
        type: "number",
        description: "Number of results to return (default: 5, max: 20)",
        default: DEFAULT_TOP_K,
        minimum: 1,
        maximum: MAX_TOP_K,
      },
    },
    required: ["query"],
  },
};
