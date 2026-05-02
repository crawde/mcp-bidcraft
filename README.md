# mcp-bidcraft

MCP server for [BidCraft](https://bidcraft.site) — AI-powered RFP analysis and proposal generation.

Analyze RFPs, generate winning proposals, and check compliance directly from your AI assistant.

## Installation

```bash
npx mcp-bidcraft
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bidcraft": {
      "command": "npx",
      "args": ["-y", "mcp-bidcraft"]
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "bidcraft": {
      "command": "npx",
      "args": ["-y", "mcp-bidcraft"]
    }
  }
}
```

## Tools

### analyze_rfp

Analyze RFP text and extract structured requirements — mandatory, desirable, and informational items with deadlines.

**Input:**
- `text` (string, required) — The full RFP text or relevant sections

**Output:** Classified requirements with types, sections, and deadlines.

### generate_proposal

Generate an AI-powered proposal from RFP text. Returns executive summary, key differentiators, and compliance preview.

**Input:**
- `rfpText` (string, required) — The RFP text to respond to
- `companyContext` (string, optional) — Your company capabilities for personalization

**Output:** Executive summary, key points, and compliance preview.

### check_compliance

Cross-reference proposal content against RFP requirements. Identifies covered, partially covered, and missing requirements.

**Input:**
- `rfpText` (string, required) — Original RFP requirements
- `proposalText` (string, required) — Your proposal response to evaluate

**Output:** Coverage score with per-requirement breakdown.

### bidcraft_info

Get BidCraft capabilities and pricing information.

## Features

- **No account required** — Free tier works instantly via MCP (3 analyses/day)
- **Structured output** — Requirements classified by type with deadlines
- **Compliance gap detection** — Find what's missing before you submit
- **Pro upgrade path** — Full 6-section proposals, DOCX export, win scoring

## Pricing

| Plan | Price | Includes |
|------|-------|----------|
| Free (MCP) | $0 | 3 analyses/day, quick proposals, basic compliance |
| Per-proposal | $29 | Full 6-section proposal + DOCX + compliance score |
| Pro | $799/mo | Unlimited proposals, win scoring, AI Bid Brief |
| Team | $1,499/mo | Pro for 5 users + shared workspace |

## License

MIT
