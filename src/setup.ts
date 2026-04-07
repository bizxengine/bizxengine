import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const CONFIG_DIR = join(homedir(), ".bizxengine");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

// ANSI colors
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const cyan = "\x1b[36m";
const magenta = "\x1b[35m";
const dim = "\x1b[2m";
const bold = "\x1b[1m";
const reset = "\x1b[0m";

// The MCP server entry — no API key needed since we read from ~/.bizxengine/config.json
const MCP_SERVER_ENTRY = {
  command: "npx",
  args: ["-y", "@bizxengine/mcp"],
};

// Instructions that tell the AI to actually USE memory
const BIZX_INSTRUCTIONS_MARKER = "## BizXEngine Memory";
const BIZX_INSTRUCTIONS = `
## BizXEngine Memory

You have access to BizXEngine shared workspace memory. This memory persists across conversations and is shared with all agents on this workspace.

### On every conversation start:
- Use **brain.recall** to check for relevant context about the user, project, or topic before responding. This gives you continuity across sessions.

### During conversations:
- **brain.remember** — When you learn something important about the user, their preferences, project decisions, business context, or ongoing work, save it immediately. Do NOT wait to be asked.
- **brain.recall** — Before answering questions about past context, preferences, decisions, or anything discussed previously, check memory first.
- **brain.answer** — For questions that need reasoning across multiple memories like "what do we know about X?" or "summarize recent decisions".
- **brain.health** — When asked about memory health or quality.

### Rules:
- Be proactive: if the user shares something worth remembering, store it right away.
- Always check memory before saying "I don't know" or "I don't have context".
- Do NOT store trivial chat, greetings, or temporary information.
- Other agents on this workspace can see the same memories — write clearly.
`;

interface McpClient {
  name: string;
  configPath: string;
  serverKey: string;
  instructionsPath: string | null; // where AI reads its instructions
}

function getKnownClients(): McpClient[] {
  const home = homedir();
  const os = platform();

  const clients: McpClient[] = [];

  // Claude Desktop
  if (os === "darwin") {
    clients.push({
      name: "Claude Desktop",
      configPath: join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json"),
      serverKey: "mcpServers",
      instructionsPath: null, // Claude Desktop doesn't have a global instructions file
    });
  } else if (os === "linux") {
    clients.push({
      name: "Claude Desktop",
      configPath: join(home, ".config", "Claude", "claude_desktop_config.json"),
      serverKey: "mcpServers",
      instructionsPath: null,
    });
  } else if (os === "win32") {
    const appData = process.env.APPDATA || join(home, "AppData", "Roaming");
    clients.push({
      name: "Claude Desktop",
      configPath: join(appData, "Claude", "claude_desktop_config.json"),
      serverKey: "mcpServers",
      instructionsPath: null,
    });
  }

  // Claude Code
  clients.push({
    name: "Claude Code",
    configPath: join(home, ".claude.json"),
    serverKey: "mcpServers",
    instructionsPath: join(home, ".claude", "CLAUDE.md"),
  });

  // Cursor
  clients.push({
    name: "Cursor",
    configPath: join(home, ".cursor", "mcp.json"),
    serverKey: "mcpServers",
    instructionsPath: join(home, ".cursor", "rules", "bizxengine.mdc"),
  });

  // Windsurf
  clients.push({
    name: "Windsurf",
    configPath: join(home, ".codeium", "windsurf", "mcp_config.json"),
    serverKey: "mcpServers",
    instructionsPath: join(home, ".codeium", "windsurf", "memories", "bizxengine.md"),
  });

  // VS Code
  clients.push({
    name: "VS Code",
    configPath: join(home, ".vscode", "mcp.json"),
    serverKey: "servers",
    instructionsPath: null,
  });

  return clients;
}

function detectInstalledClients(): McpClient[] {
  const all = getKnownClients();
  const detected: McpClient[] = [];

  for (const client of all) {
    const configDir = join(client.configPath, "..");
    if (existsSync(client.configPath) || existsSync(configDir)) {
      detected.push(client);
    }
  }

  return detected;
}

function isAlreadyConfigured(client: McpClient): boolean {
  try {
    if (!existsSync(client.configPath)) return false;
    const data = JSON.parse(readFileSync(client.configPath, "utf-8"));
    const servers = data[client.serverKey];
    return servers && "bizxengine" in servers;
  } catch {
    return false;
  }
}

function addToClientConfig(client: McpClient): boolean {
  try {
    let data: Record<string, unknown> = {};

    if (existsSync(client.configPath)) {
      const raw = readFileSync(client.configPath, "utf-8");
      data = raw.trim() ? JSON.parse(raw) : {};
    } else {
      const configDir = join(client.configPath, "..");
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }
    }

    if (!data[client.serverKey] || typeof data[client.serverKey] !== "object") {
      data[client.serverKey] = {};
    }

    (data[client.serverKey] as Record<string, unknown>)["bizxengine"] = MCP_SERVER_ENTRY;

    writeFileSync(client.configPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    return true;
  } catch {
    return false;
  }
}

function hasInstructions(client: McpClient): boolean {
  if (!client.instructionsPath) return false;
  try {
    if (!existsSync(client.instructionsPath)) return false;
    const content = readFileSync(client.instructionsPath, "utf-8");
    return content.includes(BIZX_INSTRUCTIONS_MARKER);
  } catch {
    return false;
  }
}

function injectInstructions(client: McpClient): boolean {
  if (!client.instructionsPath) return false;

  try {
    const dir = join(client.instructionsPath, "..");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    let existing = "";
    if (existsSync(client.instructionsPath)) {
      existing = readFileSync(client.instructionsPath, "utf-8");

      // Already has instructions
      if (existing.includes(BIZX_INSTRUCTIONS_MARKER)) return true;
    }

    // Append instructions
    const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
    writeFileSync(
      client.instructionsPath,
      existing + separator + BIZX_INSTRUCTIONS,
      "utf-8"
    );

    return true;
  } catch {
    return false;
  }
}

export function loadSavedApiKey(): string | undefined {
  try {
    if (!existsSync(CONFIG_FILE)) return undefined;
    const data = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    return data.apiKey || undefined;
  } catch {
    return undefined;
  }
}

function saveApiKey(key: string): void {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(CONFIG_FILE, JSON.stringify({ apiKey: key }, null, 2), "utf-8");
  } catch {
    // silently fail — key still works for this session
  }
}

let sharedRl: ReturnType<typeof createInterface> | undefined;

function getReadline(): ReturnType<typeof createInterface> {
  if (!sharedRl) {
    sharedRl = createInterface({
      input: process.stdin,
      output: process.stderr,
    });
  }
  return sharedRl;
}

export function closeReadline(): void {
  if (sharedRl) {
    sharedRl.close();
    sharedRl = undefined;
  }
}

function prompt(question: string, defaultValue = ""): Promise<string> {
  const rl = getReadline();
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
    // If stdin closes before answer, resolve with default
    rl.once("close", () => resolve(defaultValue));
  });
}

export async function runInteractiveSetup(): Promise<string | undefined> {
  process.stderr.write(`\n`);
  process.stderr.write(`${yellow}${bold}  \u{1F510}  BizXEngine Setup${reset}\n`);
  process.stderr.write(`${dim}  ─────────────────────────────────────${reset}\n\n`);

  process.stderr.write(`${cyan}  Welcome! Let's connect your AI to BizXEngine.${reset}\n\n`);

  process.stderr.write(`  ${bold}Step 1${reset} ${dim}\u2192${reset} Open ${magenta}${bold}https://app.bizxengine.com${reset}\n`);
  process.stderr.write(`  ${bold}Step 2${reset} ${dim}\u2192${reset} Create or select your workspace\n`);
  process.stderr.write(`  ${bold}Step 3${reset} ${dim}\u2192${reset} Go to ${cyan}API Keys${reset}\n`);
  process.stderr.write(`  ${bold}Step 4${reset} ${dim}\u2192${reset} Generate a new key and paste it below\n\n`);

  const key = await prompt(`  ${green}${bold}\u2192 Paste your API key here: ${reset}`);

  if (!key) {
    process.stderr.write(`\n  ${yellow}No key entered. You can run this again anytime.${reset}\n\n`);
    closeReadline();
    return undefined;
  }

  saveApiKey(key);

  process.stderr.write(`\n  ${green}${bold}\u2714 API key saved!${reset}\n\n`);

  // --- Auto-configure AI tools ---
  await configureClients();

  closeReadline();
  return key;
}

async function configureClients(): Promise<void> {
  const detected = detectInstalledClients();

  if (detected.length === 0) {
    printManualConfig();
    return;
  }

  process.stderr.write(`  ${cyan}${bold}Detected AI tools on your system:${reset}\n\n`);

  const toConfigureList: McpClient[] = [];

  for (const client of detected) {
    if (isAlreadyConfigured(client)) {
      process.stderr.write(`    ${green}\u2714${reset} ${bold}${client.name}${reset} ${dim}already connected${reset}\n`);
    } else {
      process.stderr.write(`    ${cyan}\u2022${reset} ${bold}${client.name}${reset} ${dim}found${reset}\n`);
      toConfigureList.push(client);
    }
  }

  process.stderr.write(`\n`);

  if (toConfigureList.length === 0) {
    // Even if MCP is configured, check if instructions are missing
    await injectAllInstructions(detected);
    process.stderr.write(`  ${green}${bold}All detected tools are already connected!${reset}\n\n`);
    return;
  }

  const names = toConfigureList.length === 1
    ? toConfigureList[0].name
    : "all detected tools";

  const answer = await prompt(`  ${green}${bold}\u2192 Add BizXEngine to ${names}? (Y/n): ${reset}`, "y");

  const yes = !answer || answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";

  if (!yes) {
    process.stderr.write(`\n`);
    printManualConfig();
    return;
  }

  process.stderr.write(`\n`);

  const configured: McpClient[] = [];

  for (const client of toConfigureList) {
    const ok = addToClientConfig(client);
    if (ok) {
      process.stderr.write(`    ${green}${bold}\u2714${reset} ${bold}${client.name}${reset} ${green}MCP connected${reset}\n`);
      configured.push(client);
    } else {
      process.stderr.write(`    ${yellow}\u2717${reset} ${bold}${client.name}${reset} ${dim}could not write config${reset}\n`);
    }
  }

  process.stderr.write(`\n`);

  // Inject AI instructions into all successfully configured clients
  await injectAllInstructions(configured);

  process.stderr.write(`  ${yellow}${bold}\u21BB Restart your AI tool to activate BizXEngine.${reset}\n\n`);
}

async function injectAllInstructions(clients: McpClient[]): Promise<void> {
  const needsInstructions = clients.filter(
    (c) => c.instructionsPath && !hasInstructions(c)
  );

  if (needsInstructions.length === 0) return;

  for (const client of needsInstructions) {
    const ok = injectInstructions(client);
    if (ok) {
      process.stderr.write(`    ${green}${bold}\u2714${reset} ${bold}${client.name}${reset} ${green}memory instructions added${reset}\n`);
    }
  }

  process.stderr.write(`\n`);
  process.stderr.write(`  ${dim}Your AI will now proactively remember and recall information.${reset}\n\n`);
}

function printManualConfig(): void {
  process.stderr.write(`  ${dim}To connect manually, add this to your AI tool's MCP config:${reset}\n\n`);
  process.stderr.write(`  ${cyan}${bold}{${reset}\n`);
  process.stderr.write(`  ${cyan}${bold}  "mcpServers": {${reset}\n`);
  process.stderr.write(`  ${cyan}${bold}    "bizxengine": {${reset}\n`);
  process.stderr.write(`  ${cyan}${bold}      "command": "npx",${reset}\n`);
  process.stderr.write(`  ${cyan}${bold}      "args": ["-y", "@bizxengine/mcp"]${reset}\n`);
  process.stderr.write(`  ${cyan}${bold}    }${reset}\n`);
  process.stderr.write(`  ${cyan}${bold}  }${reset}\n`);
  process.stderr.write(`  ${cyan}${bold}}${reset}\n\n`);
  process.stderr.write(`  ${dim}Works with Claude, Cursor, Windsurf, VS Code, and any MCP-compatible tool.${reset}\n\n`);
}

export function runSilentInstall(apiKey: string): boolean {
  const key = apiKey.trim();
  if (!key) {
    process.stderr.write(`  ${yellow}No API key provided.${reset}\n\n`);
    return false;
  }

  // 1. Save key
  saveApiKey(key);
  process.stderr.write(`  ${green}${bold}\u2714${reset} API key saved\n`);

  // 2. Auto-configure all detected clients
  const detected = detectInstalledClients();
  let anyConfigured = false;

  for (const client of detected) {
    if (isAlreadyConfigured(client)) {
      process.stderr.write(`  ${green}${bold}\u2714${reset} ${bold}${client.name}${reset} ${dim}already connected${reset}\n`);
      anyConfigured = true;
    } else {
      const ok = addToClientConfig(client);
      if (ok) {
        process.stderr.write(`  ${green}${bold}\u2714${reset} ${bold}${client.name}${reset} ${green}MCP connected${reset}\n`);
        anyConfigured = true;
      }
    }
  }

  // 3. Inject AI instructions
  for (const client of detected) {
    if (client.instructionsPath && !hasInstructions(client)) {
      const ok = injectInstructions(client);
      if (ok) {
        process.stderr.write(`  ${green}${bold}\u2714${reset} ${bold}${client.name}${reset} ${green}memory instructions added${reset}\n`);
      }
    }
  }

  if (!anyConfigured && detected.length === 0) {
    printManualConfig();
  }

  process.stderr.write(`\n`);
  return true;
}

export function resolveApiKey(): string | undefined {
  return process.env.BIZX_API_KEY || loadSavedApiKey() || undefined;
}
