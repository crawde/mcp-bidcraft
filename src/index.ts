#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = "https://bidcraft.site";

interface Requirement {
  section: string;
  description: string;
  type: string;
  deadline?: string;
}

interface AnalyzeResponse {
  id: string;
  title: string;
  requirements: Requirement[];
  analysesRemaining: number;
  error?: string;
}

interface GenerateResponse {
  title: string;
  executiveSummary: string;
  keyPoints: string[];
  compliancePreview: string;
  error?: string;
}

async function apiRequest<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({
      error: res.statusText,
    }))) as { error?: string };
    throw new Error(
      `BidCraft API error ${res.status}: ${err.error || res.statusText}`
    );
  }

  return res.json() as Promise<T>;
}

const server = new McpServer({
  name: "mcp-bidcraft",
  version: "1.0.0",
});

// ── Tool 1: Analyze RFP ──────────────────────────────────────────────
server.tool(
  "analyze_rfp",
  "Analyze RFP (Request for Proposal) text and extract structured requirements — mandatory, desirable, and informational items with deadlines and sections. Useful for understanding what an RFP is asking for before writing a response.",
  {
    text: z
      .string()
      .describe(
        "The full RFP text or relevant sections to analyze. Include requirements, deadlines, evaluation criteria, and scope of work."
      ),
  },
  async ({ text }) => {
    if (text.trim().length < 50) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Please provide at least 50 characters of RFP content for meaningful analysis.",
          },
        ],
        isError: true,
      };
    }

    try {
      const data = await apiRequest<AnalyzeResponse>("/api/analyze", {
        quickMode: true,
        text,
      });

      const reqList = (data.requirements || [])
        .map(
          (r, i) =>
            `${i + 1}. [${r.type.toUpperCase()}] ${r.section}: ${r.description}${r.deadline ? ` (Due: ${r.deadline})` : ""}`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `# RFP Analysis: ${data.title || "Untitled"}\n\n**Requirements Found:** ${(data.requirements || []).length}\n\n${reqList}\n\n---\nUse generate_proposal with this RFP text to create a full response.\nFull compliance scoring and win analysis: https://bidcraft.site`,
          },
        ],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("402")) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Free analysis limit reached (3/day). Get unlimited RFP analysis at https://bidcraft.site/signup",
            },
          ],
          isError: true,
        };
      }
      return {
        content: [{ type: "text" as const, text: `Error: ${msg}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 2: Generate Proposal ────────────────────────────────────────
server.tool(
  "generate_proposal",
  "Generate an AI-powered proposal response from RFP text. Returns executive summary, key differentiators, and compliance preview. Use after analyzing the RFP to create a compelling bid response.",
  {
    rfpText: z
      .string()
      .describe(
        "The full RFP text or key sections to generate a proposal from. Include requirements, evaluation criteria, and deliverables."
      ),
    companyContext: z
      .string()
      .optional()
      .describe(
        "Optional context about your company — capabilities, past performance, team size, certifications — to personalize the proposal."
      ),
  },
  async ({ rfpText, companyContext }) => {
    if (rfpText.trim().length < 50) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Please provide at least 50 characters of RFP content for proposal generation.",
          },
        ],
        isError: true,
      };
    }

    try {
      const body: Record<string, unknown> = { quickMode: true, rfpText };
      if (companyContext) body.companyContext = companyContext;

      const data = await apiRequest<GenerateResponse>("/api/generate", body);

      const keyPoints = (data.keyPoints || [])
        .map((p) => `- ${p}`)
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `# ${data.title || "Proposal Response"}\n\n## Executive Summary\n${data.executiveSummary}\n\n## Key Differentiators\n${keyPoints}\n\n## Compliance Preview\n${data.compliancePreview || "N/A"}\n\n---\nFull 6-section proposals with DOCX export, compliance scoring, and win probability analysis: https://bidcraft.site/pricing`,
          },
        ],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("402")) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Free proposal limit reached. Get unlimited proposals with full sections at https://bidcraft.site/pricing",
            },
          ],
          isError: true,
        };
      }
      return {
        content: [{ type: "text" as const, text: `Error: ${msg}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 3: Compliance Check ─────────────────────────────────────────
server.tool(
  "check_compliance",
  "Cross-reference proposal content against RFP requirements to identify coverage gaps. Shows which requirements are addressed, partially covered, or missing from the proposal.",
  {
    rfpText: z
      .string()
      .describe("The original RFP text with requirements to check against."),
    proposalText: z
      .string()
      .describe(
        "The proposal or response text to evaluate for compliance with the RFP requirements."
      ),
  },
  async ({ rfpText, proposalText }) => {
    if (rfpText.trim().length < 50 || proposalText.trim().length < 50) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Both RFP and proposal text must be at least 50 characters.",
          },
        ],
        isError: true,
      };
    }

    try {
      // First analyze the RFP to get requirements
      const analysis = await apiRequest<AnalyzeResponse>("/api/analyze", {
        quickMode: true,
        text: rfpText,
      });

      const requirements = analysis.requirements || [];
      if (requirements.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No requirements could be extracted from the RFP text. Try providing more specific requirement sections.",
            },
          ],
        };
      }

      // Simple compliance check — check if each requirement keyword appears in proposal
      const proposalLower = proposalText.toLowerCase();
      const results = requirements.map((req) => {
        const keywords = req.description
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 4);
        const matchCount = keywords.filter((k) =>
          proposalLower.includes(k)
        ).length;
        const coverage =
          keywords.length > 0 ? matchCount / keywords.length : 0;
        const status =
          coverage > 0.5 ? "COVERED" : coverage > 0.2 ? "PARTIAL" : "MISSING";
        return { ...req, status, coverage: Math.round(coverage * 100) };
      });

      const covered = results.filter((r) => r.status === "COVERED").length;
      const partial = results.filter((r) => r.status === "PARTIAL").length;
      const missing = results.filter((r) => r.status === "MISSING").length;
      const score = Math.round(
        ((covered + partial * 0.5) / results.length) * 100
      );

      const details = results
        .map(
          (r) =>
            `[${r.status}] ${r.section}: ${r.description} (${r.coverage}% keyword match)`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `# Compliance Check\n\n**Overall Score:** ${score}%\n**Covered:** ${covered} | **Partial:** ${partial} | **Missing:** ${missing}\n\n## Requirement Details\n${details}\n\n---\nFor AI-powered deep compliance scoring with evidence quotes and improvement suggestions, use BidCraft Pro: https://bidcraft.site/pricing`,
          },
        ],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${msg}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 4: Capabilities & Pricing ──────────────────────────────────
server.tool(
  "bidcraft_info",
  "Get information about BidCraft capabilities, pricing plans, and features for AI-powered RFP response and proposal generation.",
  {},
  async () => {
    return {
      content: [
        {
          type: "text" as const,
          text: `# BidCraft — AI Proposal & RFP Response Generator

## Free (via this MCP server)
- RFP requirement extraction (3/day) — mandatory, desirable, informational classification
- Quick proposal generation — executive summary + key differentiators
- Basic compliance check — keyword-based requirement coverage analysis

## Pro ($799/mo or $29 per proposal)
- Unlimited full 6-section proposals (Executive Summary, Technical Approach, Team, Past Performance, Timeline, Compliance Matrix)
- Professional DOCX export with branded formatting
- AI Compliance Scoring — requirement-by-requirement with evidence quotes
- Win Probability Score (0-100) with risk factors and recommendations
- AI Bid Brief — portfolio intelligence with priority actions
- Knowledge Base — company profile, case studies, past proposals for personalization
- Proposal status tracking and deal pipeline analytics
- Section-by-section AI regeneration with custom instructions

## Team ($1,499/mo)
- Everything in Pro for up to 5 members
- Shared proposal workspace with role-based access
- Team analytics and collaboration

Website: https://bidcraft.site
Pricing: https://bidcraft.site/pricing`,
        },
      ],
    };
  }
);

// ── Start ────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
