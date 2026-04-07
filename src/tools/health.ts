import { BizXClient } from "../client.js";

interface HealthResponse {
  health_score?: number;
  score?: number;
  total_memories?: number;
  total?: number;
  stale_count?: number;
  stale?: number;
}

export async function health(client: BizXClient): Promise<string> {
  const r = await client.get<HealthResponse>("/v1/optimize/health");

  const score = r.health_score ?? r.score ?? 0;
  const total = r.total_memories ?? r.total ?? 0;
  const stale = r.stale_count ?? r.stale ?? 0;

  return [
    "Memory Health Report",
    "─────────────────────",
    `Health Score: ${(score * 100).toFixed(1)}%`,
    `Total Memories: ${total}`,
    `Stale Memories: ${stale}`,
  ].join("\n");
}

export const healthTool = {
  name: "brain.health",
  description:
    "Inspect the health and quality of your BizXEngine workspace memory store. Returns health score, total memory count, and stale memory signals. Use to diagnose memory quality issues.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};
