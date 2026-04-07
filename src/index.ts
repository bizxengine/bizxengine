#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { ADAPTER_VERSION } from "./config.js";
import { resolveApiKey, runInteractiveSetup, runSilentInstall, closeReadline } from "./setup.js";

// ANSI colors
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const cyan = "\x1b[36m";
const dim = "\x1b[2m";
const bold = "\x1b[1m";
const reset = "\x1b[0m";

function printBanner(): void {
  process.stderr.write(`\n  ${green}${bold}\u2714 BizXEngine MCP Adapter${reset} ${dim}v${ADAPTER_VERSION}${reset}\n`);
  process.stderr.write(`  ${dim}─────────────────────────────────────${reset}\n\n`);
}

function printConnected(): void {
  process.stderr.write(`  ${green}${bold}\u2714 Connected to BizXEngine${reset}\n\n`);
  process.stderr.write(`  ${dim}Your AI now has access to:${reset}\n\n`);
  process.stderr.write(`    ${green}\u2022${reset} ${cyan}Memory${reset}     ${dim}remember & recall${reset}\n`);
  process.stderr.write(`    ${green}\u2022${reset} ${cyan}Answers${reset}    ${dim}intelligent reasoning${reset}\n`);
  process.stderr.write(`    ${green}\u2022${reset} ${cyan}Health${reset}     ${dim}memory monitoring${reset}\n\n`);
  process.stderr.write(`  ${green}${bold}Ready.${reset} ${dim}Your AI is now smarter.${reset}\n\n`);
}

function printNotConnected(): void {
  process.stderr.write(`  ${yellow}${bold}\u{1F510} Not connected yet${reset}\n\n`);
  process.stderr.write(`  ${dim}To connect, just ask your AI:${reset}\n\n`);
  process.stderr.write(`  ${cyan}${bold}"Install BizXEngine memory, my API key is <your-key>"${reset}\n\n`);
  process.stderr.write(`  ${dim}Get your key at${reset} ${magenta}https://app.bizxengine.com${reset}\n\n`);
}

const magenta = "\x1b[35m";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // --install <key> — silent install mode (for AI to run)
  if (args[0] === "--install" && args[1]) {
    printBanner();
    const ok = runSilentInstall(args[1]);
    if (ok) {
      printConnected();
      process.stderr.write(`  ${yellow}${bold}\u21BB Restart your AI tool to activate BizXEngine.${reset}\n\n`);
    }
    process.exit(ok ? 0 : 1);
  }

  // Interactive terminal (user ran npx @bizxengine/mcp directly)
  const isInteractive = process.stdin.isTTY === true;

  printBanner();

  let apiKey = resolveApiKey();

  if (!apiKey && isInteractive) {
    apiKey = await runInteractiveSetup();

    if (apiKey) {
      printConnected();
    }
    process.exit(apiKey ? 0 : 1);
  }

  // Non-interactive (MCP client like Claude/Cursor) — start server
  const server = createServer();

  if (apiKey) {
    printConnected();
  } else {
    printNotConnected();
  }

  const transport = new StdioServerTransport();

  process.on("SIGINT", () => {
    process.stderr.write(`\n  ${dim}BizXEngine MCP Adapter shutting down${reset}\n`);
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    process.stderr.write(`\n  ${dim}BizXEngine MCP Adapter shutting down${reset}\n`);
    process.exit(0);
  });

  await server.connect(transport);
}

main().catch(() => {
  process.stderr.write(`\n  ${yellow}BizXEngine MCP Adapter failed to start.${reset}\n`);
  process.exit(1);
});
