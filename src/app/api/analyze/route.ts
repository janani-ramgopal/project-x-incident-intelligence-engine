import { NextRequest, NextResponse } from "next/server";
import type { IncidentInput, StackId } from "@/core/types";

import { retrieveStandardsSnippets } from "@/core/standards/retrieve";
import { runPolicyChecks } from "@/core/policy/policyEngine";
import { getStackAdapter } from "@/core/stacks";
import { buildSystemPrompt, buildUserPrompt } from "@/core/llm/prompts";
import { callOpenAIJson } from "@/core/llm/client";

import { sanitizeInputText } from "@/core/safety/sanitize";
import { truncate, MAX_LOG_CHARS, MAX_CHANGES_CHARS } from "@/core/safety/limits";
import { isStackId } from "@/core/safety/stack";
import { extractSignals } from "@/core/extract/logSignals";
import { IncidentReportSchema } from "@/core/schema/incidentSchema";

export const runtime = "nodejs";

type DebugInfo = {
    stack?: string;
    inputLengths?: {
        incidentSummary: number;
        logs: number;
        recentChanges: number;
    };
    redactions?: {
        logs: number;
        recentChanges: number;
    };
    truncation?: {
        logs: boolean;
        recentChanges: boolean;
    };
    counts?: {
        citations: number;
        policyFindings: number;
    };
};

export async function POST(req: NextRequest) {

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    let rawBody: any;

    try {
        rawBody = await req.json();
    } catch (err) {
        console.error("Invalid JSON body:", err);
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    // Validate + normalize
    const stackRaw = rawBody?.stack;
    const incidentSummaryRaw = rawBody?.incidentSummary;
    const logsRaw = rawBody?.logs;
    const recentChangesRaw = rawBody?.recentChanges;

    if (!isStackId(stackRaw)) {
        return NextResponse.json(
            { error: "Invalid stack. Use 'node' or 'java'." },
            { status: 400 }
        );
    }

    const stack: StackId = stackRaw;

    // Only logs are required for analysis (summary optional)
    if (typeof logsRaw !== "string" || !logsRaw.trim()) {
        return NextResponse.json(
            { error: "Missing required field: logs." },
            { status: 400 }
        );
    }

    const incidentSummary =
        typeof incidentSummaryRaw === "string" && incidentSummaryRaw.trim()
            ? incidentSummaryRaw.trim()
            : "(not provided)";

    const logs = logsRaw;
    const recentChanges =
        typeof recentChangesRaw === "string" ? recentChangesRaw : "";

    // Sanitize + truncate
    const logsSanitized = sanitizeInputText(logs);
    const changesSanitized = sanitizeInputText(recentChanges);
    const signals = extractSignals(logsSanitized.sanitized, 4);
    const logsTrunc = truncate(logsSanitized.sanitized, MAX_LOG_CHARS);
    const changesTrunc = truncate(changesSanitized.sanitized, MAX_CHANGES_CHARS);

    const safety = {
        assumptions: [] as string[],
        unknowns: [] as string[],
        redFlags: [] as string[],
    };

    if (logsTrunc.wasTruncated) safety.redFlags.push("Logs truncated; evidence may be missing.");
    if (changesTrunc.wasTruncated) safety.redFlags.push("Recent changes truncated; evidence may be missing.");
    if (logsSanitized.redactions.length > 0) safety.assumptions.push("Sensitive information was redacted from logs.");
    if (changesSanitized.redactions.length > 0) safety.assumptions.push("Sensitive information was redacted from recent changes.");

    const safeLogs = logsTrunc.text;
    const safeChanges = changesTrunc.text;

    const text = [incidentSummary, safeLogs, safeChanges].filter(Boolean).join("\n\n");

    const debug: DebugInfo = {
        stack,
        inputLengths: {
            incidentSummary: incidentSummary.length,
            logs: logs.length,
            recentChanges: recentChanges.length,
        },
        redactions: {
            logs: logsSanitized.redactions.length,
            recentChanges: changesSanitized.redactions.length,
        },
        truncation: {
            logs: logsTrunc.wasTruncated,
            recentChanges: changesTrunc.wasTruncated,
        },
    };

    // Minimal safe logging (no raw logs)
    console.log({
        stack,
        incidentSummaryLength: incidentSummary.length,
        logsLength: logs.length,
        logsRedactions: logsSanitized.redactions.length,
        logsTruncated: logsTrunc.wasTruncated,
        recentChangesLength: recentChanges.length,
        changesRedactions: changesSanitized.redactions.length,
        changesTruncated: changesTrunc.wasTruncated,
    });

    //console.log('raw logs  + ' + rawBody.logs);
    //console.log('sanitized logs : ' , logsSanitized.sanitized);

    try {
        const stackAdapter = getStackAdapter(stack);

        const [citations, policyFindings] = await Promise.all([
            retrieveStandardsSnippets({ stack, text }),
            runPolicyChecks({ stack, text }),
        ]);

        debug.counts = {
            citations: citations.length,
            policyFindings: policyFindings.length,
        };

        const system = buildSystemPrompt();
        const user = buildUserPrompt({
            incident: { stack, incidentSummary, logs: safeLogs, recentChanges: safeChanges },
            stackAdapter,
            policyFindings,
            citations,
            safety,
            signals
        });
        console.log("PROMPT LENGTHS", { system: system.length, user: user.length });

        const raw = await callOpenAIJson(system, user);
        const parsed1 = IncidentReportSchema.safeParse(raw);

        let report: any;

        if (parsed1.success) {
            report = parsed1.data;
        } else {
            console.error("Zod validation failed:", parsed1.error);

            const repairPrompt =
                `Return JSON ONLY. Fix missing/incorrect fields.\n` +
                `Rules:\n` +
                `- hypotheses must be an array\n` +
                `- each hypothesis must have: rank (number), title (string), rationale (string), riskLevel (string), evidenceToConfirm (string[]), evidenceToFalsify (string[])\n` +
                `- if unknown, use empty string "" or []\n`;

            const repaired = await callOpenAIJson(system, user + "\n\n" + repairPrompt);
            const parsed2 = IncidentReportSchema.safeParse(repaired);

            report = parsed2.success ? parsed2.data : {
                summary: { situation: "", likelyRootCause: "", immediateActions: [] },
                hypotheses: [],
                safety: { assumptions: [], unknowns: ["LLM output failed schema validation twice."], redFlags: [] },
                meta: { generatedAt: new Date().toISOString(), model: process.env.OPENAI_MODEL ?? "unknown" },
            };
        }
        // If your client returns parse error objects, handle them
        if (report?.__parseError) {
            return NextResponse.json(
                {
                    error: "Model output not valid JSON",
                    rawPreview: report.rawPreview,
                    debug,
                },
                { status: 502 }
            );
        }
        console.log(report);
        report.signals = signals;
        report.debug = debug;

        // Ensure meta
        report.meta = report.meta || {};
        report.meta.generatedAt = report.meta.generatedAt || new Date().toISOString();
        report.meta.stack = report.meta.stack || stack;
        report.meta.model = report.meta.model || (process.env.OPENAI_MODEL ?? "unknown");
        if (!report.preventativeGuardrails && report.preventiveGuardrails) {
            report.preventativeGuardrails = report.preventiveGuardrails;
        }

        if (!report.observabilityGaps && report.observabilityGap) {
            report.observabilityGaps = report.observabilityGap;
        }
        // Hard defaults so UI never shows empty sections
        report.reproductionPlan = Array.isArray(report.reproductionPlan) ? report.reproductionPlan : [];
        report.faultInjectionChecklist = Array.isArray(report.faultInjectionChecklist) ? report.faultInjectionChecklist : [];
        report.regressionTests = Array.isArray(report.regressionTests) ? report.regressionTests : [];
        report.observabilityGaps = Array.isArray(report.observabilityGaps) ? report.observabilityGaps : [];
        report.preventativeGuardrails = Array.isArray(report.preventativeGuardrails) ? report.preventativeGuardrails : [];
        report.citations = Array.isArray(report.citations) ? report.citations : [];
        report.safety = report.safety || { assumptions: [], unknowns: [], redFlags: [] };

        // Deterministic fallbacks (if model still returns empty)
        const topSignals = (report.signals || []).slice(0, 3).map((s: any) => s?.reason || s?.line).filter(Boolean);

        if (report.reproductionPlan.length === 0) {
            report.reproductionPlan = [
                "Identify a single failing request/job run and capture correlationId/timestamps.",
                "Re-run in lower env with same inputs and config (feature flags, toggles).",
                "Enable debug logging for the failing module + DB/HTTP client layer.",
                "Replay with controlled concurrency/load until the signal reproduces.",
                "Confirm fix by re-running the same scenario and asserting no recurrence."
            ];
        }

        if (report.faultInjectionChecklist.length === 0) {
            report.faultInjectionChecklist = [
                "DB: slow query / lock contention / failover simulation",
                "HTTP: timeouts, retries, partial responses, 5xx bursts",
                "Concurrency: parallel job executions / duplicate triggers",
                "Data: null/empty fields, boundary sizes, unexpected JSON types",
                "Infra: restart mid-flight, thread pool exhaustion",
                "Config: missing env var, wrong endpoint, wrong schema migration"
            ];
        }

        if (report.regressionTests.length === 0) {
            report.regressionTests = [
                "Unit test: null/empty handling for all request fields used in branching logic",
                "Integration test: DB bind/insert/update with representative payload types",
                "Contract test: request/response schema validation on API boundaries",
                "Resilience test: retry + timeout behavior under injected latency",
                "Concurrency test: duplicate trigger prevention / idempotency check"
            ];
        }

        if (report.observabilityGaps.length === 0) {
            report.observabilityGaps = [
                "Missing structured fields: correlationId, jobId, flight/PNR identifiers in every log line",
                "No metric for failure rate per job type / endpoint",
                "No trace spans across controller → service → DB",
                "No log sampling rules for noisy INFO lines",
                "No dashboard panel for top recent error signatures"
            ];
        }

        if (report.preventativeGuardrails.length === 0) {
            report.preventativeGuardrails = [
                "Add input validation + schema checks before DB writes (reject unsupported types)",
                "Introduce idempotency keys for job executions to prevent duplicates",
                "Add retry policy with backoff + circuit breaker for downstream calls",
                "Add safe defaults for null map lookups and optional fields",
                "Add DB migration checks in CI (schema compatibility)",
                "Add alerting on specific error signatures and threshold-based SLOs"
            ];
        }

        if (!report.summary) report.summary = { situation: "", likelyRootCause: "", immediateActions: [] };
        if (!report.summary.situation) report.summary.situation = topSignals.length ? `Detected signals: ${topSignals.join(" | ")}` : "Log anomalies detected, but no explicit root error provided.";
        if (!report.summary.likelyRootCause) report.summary.likelyRootCause = topSignals.find((x: string) => /sql|bind|timeout|not found|exception/i.test(x)) || "";
        if (!Array.isArray(report.summary.immediateActions)) report.summary.immediateActions = [];
        if (report.summary.immediateActions.length === 0) report.summary.immediateActions = ["Collect correlationId + failing inputs", "Confirm scope (single job vs systemic)", "Reproduce in lower env with debug logging enabled"];


        // Attach debug (optional). If you don't want it in UI, remove.
        report.debug = debug;

        return NextResponse.json(report);
    } catch (err: any) {
        console.error("Error analyzing incident:", err);

        return NextResponse.json(
            {
                error: "Failed to analyze incident.",
                details: err?.message ?? String(err),
                name: err?.name,
                status: err?.status,
                code: err?.code,
                cause: err?.cause,
                debug,
            },
            { status: 500 }
        );
    }
}
