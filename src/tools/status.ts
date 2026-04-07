import { BizXClient } from "../client.js";
import { ADAPTER_VERSION } from "../config.js";

const NOT_CONNECTED_MESSAGE = `\u{1F9E0} BizXEngine is not connected yet

Your AI is ready to use BizXEngine, but it needs access.

Please connect your workspace:

\u2192 Open BizXEngine dashboard
\u2192 Create your workspace
\u2192 Generate an API key
\u2192 Add it to your MCP configuration

Once connected, your AI will be able to remember, learn, and improve over time.`;

const CONNECTED_MESSAGE = `\u2705 BizXEngine connected successfully

Your AI now has access to:

\u2022 Memory (remember & recall)
\u2022 Intelligent answers
\u2022 Memory health monitoring

Workspace is active and ready.`;

export async function status(client: BizXClient): Promise<string> {
  if (!client.authConfigured) {
    return NOT_CONNECTED_MESSAGE;
  }
  return CONNECTED_MESSAGE;
}

export const statusTool = {
  name: "brain.status",
  description:
    "Check whether BizXEngine is connected and ready. Shows connection status and available capabilities. Useful for verifying setup.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};
