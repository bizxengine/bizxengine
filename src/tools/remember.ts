import { BizXClient } from "../client.js";
import { ValidationError } from "../errors.js";

const MAX_CONTENT_LENGTH = 10_000;

interface StoreResponse {
  memory_id?: string;
  chunk_id?: string;
  id?: string;
  status?: string;
  importance?: number;
  categories?: string[];
  dedup?: { action?: string };
  temporal?: { type?: string };
}

export async function remember(
  client: BizXClient,
  args: Record<string, unknown>
): Promise<string> {
  const raw = args.content;
  if (typeof raw !== "string") {
    throw new ValidationError("content is required and must be a string");
  }

  const content = raw.trim();
  if (content.length === 0) {
    throw new ValidationError("content must not be empty or whitespace-only");
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new ValidationError(`content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`);
  }

  const r = await client.post<StoreResponse>("/v1/memory/store", { content });

  const id = r.memory_id || r.chunk_id || r.id;
  const importance = r.importance;
  const categories = r.categories;
  const temporalType = r.temporal?.type;
  const action = r.dedup?.action;

  const lines: string[] = ["Memory saved successfully."];

  if (id) lines.push(`ID: ${id}`);
  if (importance !== undefined) lines.push(`Importance: ${importance}/10`);
  lines.push(`Categories: ${categories && categories.length > 0 ? categories.join(", ") : "none"}`);
  lines.push(`Type: ${temporalType || "unknown"}`);
  if (action) lines.push(`Action: ${action}`);

  return lines.join("\n");
}

export const rememberTool = {
  name: "brain.remember",
  description:
    "Store important information in BizXEngine's memory. Use when learning something significant about the user, their project, preferences, business context, decisions, or ongoing work. Avoid storing trivial chat, greetings, or disposable information.",
  inputSchema: {
    type: "object" as const,
    properties: {
      content: {
        type: "string",
        description: "The content to remember (max 10,000 characters)",
        maxLength: MAX_CONTENT_LENGTH,
      },
    },
    required: ["content"],
  },
};
