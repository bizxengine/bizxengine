import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BizXClient } from "./client.js";
import { formatError } from "./errors.js";
import { remember, rememberTool } from "./tools/remember.js";
import { recall, recallTool } from "./tools/recall.js";
import { answer, answerTool } from "./tools/answer.js";
import { health, healthTool } from "./tools/health.js";
import { status, statusTool } from "./tools/status.js";
import { ADAPTER_VERSION } from "./config.js";
import { z } from "zod";

export function createServer(): McpServer {
  const client = new BizXClient();

  const server = new McpServer({
    name: "BizXEngine",
    version: ADAPTER_VERSION,
  });

  // brain.remember
  server.tool(
    rememberTool.name,
    rememberTool.description,
    {
      content: z.string().max(10000).describe("The content to remember (max 10,000 characters)"),
    },
    async ({ content }) => {
      return handleToolCall(() => remember(client, { content }));
    }
  );

  // brain.recall
  server.tool(
    recallTool.name,
    recallTool.description,
    {
      query: z.string().max(2000).describe("The search query (max 2,000 characters)"),
      top_k: z.number().min(1).max(20).default(5).optional().describe("Number of results to return (default: 5, max: 20)"),
    },
    async ({ query, top_k }) => {
      return handleToolCall(() => recall(client, { query, top_k }));
    }
  );

  // brain.answer
  server.tool(
    answerTool.name,
    answerTool.description,
    {
      query: z.string().max(2000).describe("The question to answer (max 2,000 characters)"),
      top_k: z.number().min(1).max(15).default(8).optional().describe("Number of memories to consider (default: 8, max: 15)"),
    },
    async ({ query, top_k }) => {
      return handleToolCall(() => answer(client, { query, top_k }));
    }
  );

  // brain.health
  server.tool(
    healthTool.name,
    healthTool.description,
    {},
    async () => {
      return handleToolCall(() => health(client));
    }
  );

  // brain.status
  server.tool(
    statusTool.name,
    statusTool.description,
    {},
    async () => {
      return handleToolCall(() => status(client));
    }
  );

  return server;
}

async function handleToolCall(
  fn: () => Promise<string>
): Promise<{ content: { type: "text"; text: string }[] }> {
  try {
    const result = await fn();
    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    return { content: [{ type: "text", text: formatError(error) }] };
  }
}
