// src/core/llm/prompts.ts
import type { Citation } from "@/core/types";
import { Signal } from "../extract/logSignals";

type IncidentInput = {
    stack: string;
    incidentSummary: string;
    logs: string;
    recentChanges: string;
};

type StackAdapter = {
    failurePatterns: string[];
    signalsToCheck: string[];
    safeFixGuidelines: string[];
};

type PolicyFinding = {
    id: string;
    title: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
    evidence: string;
    recommendation: string;
};

type BuildUserPromptArgs = {
    incident: IncidentInput;
    stackAdapter: StackAdapter;
    policyFindings: PolicyFinding[];
    citations: Citation[];
    safety?: {
        assumptions: string[];
        unknowns: string[];
        redFlags: string[];
    };
    signals: Signal[];
};

//   export function buildSystemPrompt(): string {
//     return [
//       "You are an expert incident responder.",
//       "Your output MUST be valid JSON only (no markdown or code fences).",
//       "The JSON must match the IncidentReport shape as defined in src/core/types.ts.",
//       "Do NOT invent facts. If information is missing or unclear, add it to safety.unknowns.",
//       "Incorporate the provided policy findings and stack heuristics into your analysis.",
//       "Include a citations[] array using only the provided citation snippets (keep them short).",
//       "Never include information not present in the input.",
//       "Respond ONLY with the JSON report.",
//       "You MUST return at least 3 hypotheses. If evidence is limited, mark rationale clearly and add uncertainty in safety.unknowns. Never return an empty hypotheses array.",
//       "Each hypothesis MUST include at least 2 evidenceToConfirm and 1 evidenceToFalsify items."
//     ].join(" ");
//   }
export function buildSystemPrompt(): string {
    return [
        "You are an expert incident responder.",
        "Return ONLY valid JSON (no markdown, no code fences).",
        "The JSON must match the IncidentReport shape.",
        "",
        "RULES:",
        "- Use ONLY the provided input (logs, signals, heuristics, policy findings, citations).",
        "- You MAY summarize/infer from the input. Do not invent external facts.",
        "- If uncertain, still provide best-effort guidance and record uncertainty in safety.unknowns.",
        "- Never output null/undefined; use empty string \"\" or [] instead.",
        "",
        "REQUIRED SECTIONS (never omit):",
        "- summary: { situation: string, likelyRootCause: string, immediateActions: string[] }",
        "- hypotheses: at least 3 items",
        "- reproductionPlan: at least 5 bullet steps (string[])",
        "- faultInjectionChecklist: at least 6 items (string[])",
        "- regressionTests: at least 5 items (string[])",
        "- observabilityGaps: at least 5 items (string[])",
        "- preventativeGuardrails: at least 6 items (string[])",
        "- safety: { assumptions: string[], unknowns: string[], redFlags: string[] }",
        "- citations: array (may be empty if none provided, but MUST exist)",
        "",
        "HYPOTHESIS RULES:",
        "- Each hypothesis must include: rank (number), title (string), rationale (string), riskLevel (string), evidenceToConfirm (string[]), evidenceToFalsify (string[]).",
        "- Each hypothesis MUST include at least 2 evidenceToConfirm and 1 evidenceToFalsify.",
        "",
        "CITATIONS RULES:",
        "- Use ONLY provided citation snippets; if none, return citations: []",
        "",
        "You MUST return at least 5 preventativeGuardrails. If uncertain, make them generic but safe and add uncertainty in safety.unknowns.",
        "Respond with JSON only."
    ].join(" ");
}


export function buildUserPrompt(args: BuildUserPromptArgs): string {
    return [
        "Incident Input:",
        `- Stack: ${args.incident.stack}`,
        `- Logs: ${args.incident.logs}`,
        `- Recent Changes: ${args.incident.recentChanges}`,
        "",
        "Stack Heuristics:",
        `- Failure Patterns: ${args.stackAdapter.failurePatterns.join("; ")}`,
        `- Signals To Check: ${args.stackAdapter.signalsToCheck.join("; ")}`,
        `- Safe Fix Guidelines: ${args.stackAdapter.safeFixGuidelines.join("; ")}`,
        "",
        "Policy Findings:",
        args.policyFindings.length
            ? args.policyFindings.map(
                (f, i) =>
                    `  ${i + 1}. [${f.severity}] ${f.title} - ${f.evidence} (Recommendation: ${f.recommendation})`
            ).join("\n")
            : "  None.",
        "",
        "Citations:",
        args.citations.length
            ? args.citations.map((c, i) => `  ${i + 1}. ${c.snippet}`).join("\n")
            : "  None.",
        "",
        "Please analyze the above information and generate a complete IncidentReport JSON object as specified.",
        "Remember: Output ONLY valid JSON, no markdown or extra text."
    ].join("\n");
}