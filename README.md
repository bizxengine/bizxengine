<div align="center">

# BizXEngine MCP

### Give your AI persistent memory in 30 seconds.

Your AI forgets everything after each conversation. BizXEngine fixes that.

One command. Your AI remembers users, projects, decisions, and context — forever.

[![npm version](https://img.shields.io/npm/v/@bizxengine/mcp.svg)](https://www.npmjs.com/package/@bizxengine/mcp)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

</div>

---

## The Problem

Every time you start a new conversation with your AI:

- It forgets who you are
- It forgets your project context
- It forgets decisions you already made
- It asks the same questions again
- Your team's agents can't share knowledge

**Your AI has amnesia. BizXEngine gives it a brain.**

---

## The Fix

```
npx @bizxengine/mcp --install YOUR_API_KEY
```

That's it. Your AI now:

- **Remembers** important information automatically
- **Recalls** past context before answering
- **Shares memory** across all agents on your team
- **Gets smarter** with every conversation

---

## How It Works

BizXEngine MCP is a lightweight adapter that connects your AI tool to [BizXEngine's](https://bizxengine.com) intelligent memory API.

```
Your AI (Claude, Cursor, etc.)
    ↓
BizXEngine MCP Adapter (this package)
    ↓
BizXEngine Memory API (cloud)
    ↓
Your workspace memory (persistent, shared)
```

The adapter is a thin bridge — all intelligence lives in BizXEngine's cloud. Your AI calls memory tools automatically, no manual work needed.

---

## Quick Start

### 1. Get your API key

Go to [app.bizxengine.com](https://app.bizxengine.com), create a workspace, and generate an API key.

### 2. Install

**Ask your AI to install it:**

> "Install BizXEngine memory, my API key is bx_your_key_here"

Your AI will run:

```bash
npx @bizxengine/mcp --install YOUR_API_KEY
```

**Or run it yourself:**

```bash
npx @bizxengine/mcp
```

This will guide you through setup interactively.

### 3. Restart your AI tool

That's it. Memory is now active.

---

## What Gets Installed

The installer automatically:

| Step | What happens |
|------|-------------|
| 1 | Saves your API key to `~/.bizxengine/config.json` |
| 2 | Adds BizXEngine MCP server to your AI tool's config |
| 3 | Injects memory instructions so your AI uses memory proactively |

**Supported AI tools** (auto-detected):

- Claude Code
- Claude Desktop
- Cursor
- Windsurf
- VS Code

---

## Tools

Your AI gets these capabilities:

| Tool | What it does |
|------|-------------|
| `brain.remember` | Save important information — preferences, decisions, context |
| `brain.recall` | Search memory before answering questions |
| `brain.answer` | Get synthesized answers across multiple memories |
| `brain.health` | Check memory quality and health score |
| `brain.status` | Verify BizXEngine is connected and running |

---

## Use Cases

### Personal AI Memory

> "Remember that I prefer TypeScript over JavaScript and always use Tailwind."

Next conversation, your AI already knows.

### Project Context

> "We decided to use PostgreSQL instead of MongoDB for the billing system."

Weeks later, your AI recalls the decision and why.

### Team Knowledge Sharing

Give all your agents the same workspace API key. Agent A learns something → Agent B knows it too.

> **Agent A:** "The client wants the dashboard redesigned by March."
>
> **Agent B (different conversation):** "Based on memory, the dashboard redesign is due by March."

### Client Work

> "This client prefers formal communication and their timezone is EST."

Every agent on the workspace remembers this for every future interaction.

### Onboarding New Agents

Spin up a new AI agent, give it the workspace key, and it instantly has access to everything the team has learned.

---

## Team Setup

For shared memory across multiple agents:

```bash
# Agent 1 (your machine)
npx @bizxengine/mcp --install bx_workspace_key_here

# Agent 2 (teammate's machine)
npx @bizxengine/mcp --install bx_workspace_key_here

# Agent 3 (CI/automation)
npx @bizxengine/mcp --install bx_workspace_key_here
```

Same key = same workspace = shared memory. It's that simple.

---

## Manual Configuration

If you prefer to configure manually:

```json
{
  "mcpServers": {
    "bizxengine": {
      "command": "npx",
      "args": ["-y", "@bizxengine/mcp"]
    }
  }
}
```

Set the API key via environment variable:

```bash
export BIZX_API_KEY=your_key_here
```

Or let the installer save it to `~/.bizxengine/config.json`.

---

## Security

- API keys are stored locally in `~/.bizxengine/config.json` — never logged or exposed
- All API calls use **HTTPS only** — enforced at startup
- The adapter **never connects to any database** directly
- Internal errors are **never exposed** to the AI or user
- Request retries only on transient failures (502/503/504)
- No data leaves your machine except to BizXEngine's API

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BIZX_API_KEY` | No* | Your workspace API key (*auto-loaded from `~/.bizxengine/config.json` if installed via CLI) |
| `BIZX_BASE_URL` | No | API URL override (development only) |

---

## How Memory Works

BizXEngine isn't just a key-value store. It's an intelligent memory system:

- **Auto-categorization** — memories are tagged and classified automatically
- **Importance scoring** — not all memories are equal, the system knows what matters
- **Hybrid search** — combines semantic similarity, recency, importance, and frequency
- **Deduplication** — won't store the same thing twice
- **Temporal awareness** — understands time-sensitive vs permanent information
- **Stale detection** — identifies outdated memories for cleanup

Your AI doesn't just store text. It builds understanding.

---

## Built With

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io) — the open standard for AI tool integration
- TypeScript + Node.js 18+
- Zero runtime dependencies beyond the MCP SDK

---

## Links

- [BizXEngine Dashboard](https://app.bizxengine.com) — manage workspaces and API keys
- [BizXEngine Website](https://bizxengine.com) — learn more
- [npm Package](https://www.npmjs.com/package/@bizxengine/mcp)

---

<div align="center">

**Stop teaching your AI the same things twice.**

[Get Started](https://app.bizxengine.com) · [npm](https://www.npmjs.com/package/@bizxengine/mcp)

</div>
