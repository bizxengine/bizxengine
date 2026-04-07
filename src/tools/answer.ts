import { BizXClient } from "../client.js";
import { ValidationError } from "../errors.js";

const MAX_QUERY_LENGTH = 2_000;
const DEFAULT_TOP_K = 8;
const MAX_TOP_K = 15;

interface ReasonResponse {
  answer?: string;
  reasoning?: string;
  result?: string;
  response?: string;
}

export async function answer(
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

  const r = await client.post<ReasonResponse>("/v1/memory/reason", {
    query,
    top_k: k,
  });

  const text = r.answer || r.reasoning || r.result || r.response;

  if (!text) {
    return "No clear answer could be derived from current memory. Try storing more context or refining the query.";
  }

  return text;
}

export const answerTool = {
  name: "brain.answer",
  description:
    "Get a synthesized answer by reasoning across multiple stored memories. Use for questions like \"what changed recently?\", \"what do we know about this client?\", or \"summarize our project decisions\". Combines relevant memories into a coherent response.",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "The question to answer (max 2,000 characters)",
        maxLength: MAX_QUERY_LENGTH,
      },
      top_k: {
        type: "number",
        description: "Number of memories to consider (default: 8, max: 15)",
        default: DEFAULT_TOP_K,
        minimum: 1,
        maximum: MAX_TOP_K,
      },
    },
    required: ["query"],
  },
};
