"use client";

import React, { useMemo, useState } from "react";

const stacks = [
  { value: "node", label: "Node.js" },
  { value: "java", label: "Java" },
] as const;

type StackValue = (typeof stacks)[number]["value"];
type TabId = "overview" | "hypotheses" | "repro" | "guardrails" | "raw";

function detectStackFromText(text: string): { stack: StackValue; confidence: number } {
  const t = (text || "").toLowerCase();
  let java = 0;
  let node = 0;

  const add = (cond: boolean, which: "java" | "node", w = 1) => {
    if (cond) which === "java" ? (java += w) : (node += w);
  };

  // Java hints
  add(/org\.springframework|jakarta\.servlet|javax\.|tomcat|http-nio|catalina/.test(t), "java", 3);
  add(/\bat\s+(com|org|java)\./.test(t), "java", 2);
  add(/caused by:|exception in thread|java\.lang\./.test(t), "java", 2);
  add(/hibernate|jpa|psql|postgresql/.test(t), "java", 1);

  // Node hints
  add(/node:internal|process\.|npm err|module_not_found/.test(t), "node", 3);
  add(/typeerror:|referenceerror:|syntaxerror:/.test(t), "node", 2);
  add(/\bat\s+.*\.(js|ts):\d+:\d+/.test(t), "node", 2);

  const total = java + node || 1;
  const confidence = Math.max(java, node) / total;
  return java >= node ? { stack: "java", confidence } : { stack: "node", confidence };
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "dark" | "muted";
}) {
  const base =
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold";
  const styles =
    variant === "dark"
      ? "border-black bg-black text-white"
      : variant === "muted"
      ? "border-zinc-300 bg-zinc-100 text-zinc-700"
      : "border-zinc-300 bg-white text-zinc-900";
  return <span className={`${base} ${styles}`}>{children}</span>;
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs font-extrabold transition ${
        active
          ? "border-black bg-black text-white"
          : "border-zinc-300 bg-white text-zinc-900 hover:border-black"
      }`}
    >
      {children}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
        copied
          ? "border-black bg-black text-white"
          : "border-black bg-white text-black hover:bg-black hover:text-white"
      }`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function JsonBlock({ value }: { value: any }) {
  const text = useMemo(() => JSON.stringify(value ?? {}, null, 2), [value]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
      <div className="absolute right-3 top-3">
        <CopyButton text={text} />
      </div>
      <pre className="overflow-auto whitespace-pre-wrap break-words p-4 pt-14 font-mono text-xs leading-5 text-zinc-900">
        {text}
      </pre>
    </div>
  );
}

function SignalsPanel({ report }: { report: any }) {
  const signals = Array.isArray(report?.signals) ? report.signals : [];

  if (!signals.length) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-extrabold">Signals Detected</div>
        <Badge variant="muted">{signals.length} signals</Badge>
      </div>

      <div className="grid gap-3">
        {signals.slice(0, 12).map((s: any, idx: number) => {
          const contextArr = Array.isArray(s?.context) ? s.context : [];
          return (
            <div key={idx} className="rounded-xl border border-zinc-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="dark">{String(s?.level || "UNKNOWN")}</Badge>
                <div className="text-xs font-bold text-zinc-900">
                  {String(s?.reason || "Signal")}
                </div>
                {s?.timestamp && (
                  <div className="text-xs text-zinc-600">{String(s.timestamp)}</div>
                )}
                {s?.correlationId && (
                  <Badge variant="muted">{String(s.correlationId)}</Badge>
                )}
              </div>

              <div className="mt-3">
                <div className="text-xs font-bold text-zinc-900">Line</div>
                <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-5 text-zinc-900">
                  {String(s?.line || "-")}
                </pre>
              </div>

              {contextArr.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-extrabold text-zinc-900">
                    Context
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-5 text-zinc-900">
                    {contextArr.join("\n")}
                  </pre>
                </details>
              )}
            </div>
          );
        })}
      </div>

      {signals.length > 12 && (
        <div className="mt-3 text-xs text-zinc-600">
          Showing first 12 signals. Use Raw JSON to view all.
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [stack, setStack] = useState<StackValue>("node");
  const [stackLocked, setStackLocked] = useState(false);
  const [detected, setDetected] = useState<{ stack: StackValue; confidence: number } | null>(null);

  const [logs, setLogs] = useState("");
  const [recentChanges, setRecentChanges] = useState("");
  const [loading, setLoading] = useState(false);

  const [tab, setTab] = useState<TabId>("overview");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stack, logs, recentChanges }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setReport(data);
      setTab("overview");
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const signalsCount = Array.isArray(report?.signals) ? report.signals.length : 0;
  const hypoCount = Array.isArray(report?.hypotheses) ? report.hypotheses.length : 0;

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      {/* full-page loader */}
      {loading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-black border-t-transparent" />
          <div className="mt-5 text-base font-extrabold">Analyzing logs…</div>
          <div className="mt-2 text-sm text-zinc-600">
            Extracting signals • Policy checks • Generating hypotheses
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1600px] px-4 py-8">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Project X – Incident Intelligence
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Node/Java logs only (for now). Paste logs → signals → hypotheses → guardrails.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Stack: {stack.toUpperCase()}</Badge>
            {detected && (
              <Badge variant="muted">
                Auto: {detected.stack.toUpperCase()} ({detected.confidence.toFixed(2)})
                {stackLocked ? " • manual" : ""}
              </Badge>
            )}
            {report && <Badge variant="default">Signals: {signalsCount}</Badge>}
            {report && <Badge variant="default">Hypotheses: {hypoCount}</Badge>}
          </div>
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
          {/* Left: Input */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              {/* Stack selector */}
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-extrabold">Input</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-600">Stack</span>
                  <select
                    value={stack}
                    onChange={(e) => {
                      setStack(e.target.value as StackValue);
                      setStackLocked(true);
                    }}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold outline-none hover:border-black focus:border-black"
                  >
                    {stacks.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
                <b>Disclaimer:</b> Paste raw logs here. We mask staff IDs (S/SC),
                IPs, and card numbers server-side before sending to the model.
              </div>

              {/* Logs */}
              <div className="mt-4">
                <label className="text-xs font-extrabold text-zinc-800">
                  Logs / Error Trace
                </label>
                <textarea
                  value={logs}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLogs(v);

                    const d = detectStackFromText(v);
                    setDetected(d);

                    if (!stackLocked && d.confidence >= 0.65) {
                      setStack(d.stack);
                    }
                  }}
                  rows={14}
                  placeholder="Paste logs here… (Java stack traces / Node errors)"
                  className="mt-2 w-full resize-y rounded-2xl border border-zinc-200 bg-white p-3 font-mono text-xs leading-5 text-zinc-900 outline-none hover:border-black focus:border-black"
                />
              </div>

              {/* Recent changes */}
              <div className="mt-4">
                <label className="text-xs font-extrabold text-zinc-800">
                  Recent Changes (optional)
                </label>
                <textarea
                  value={recentChanges}
                  onChange={(e) => setRecentChanges(e.target.value)}
                  rows={4}
                  placeholder="PR summary, config changes, dependency bumps…"
                  className="mt-2 w-full resize-y rounded-2xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900 outline-none hover:border-black focus:border-black"
                />
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={loading || !logs.trim()}
                  className={`rounded-2xl border px-4 py-3 text-sm font-extrabold transition ${
                    loading || !logs.trim()
                      ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                      : "border-black bg-white text-black hover:bg-black hover:text-white"
                  }`}
                >
                  Investigate Incident
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLogs("");
                    setRecentChanges("");
                    setReport(null);
                    setError(null);
                    setDetected(null);
                    setStackLocked(false);
                  }}
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 hover:border-black hover:text-black"
                >
                  Clear
                </button>
              </div>

              {error && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-3 text-xs text-zinc-500">
                Tip: paste more surrounding context (30–60 lines before/after) for better hypotheses.
              </div>
            </div>
          </div>

          {/* Right: Report */}
          <div>
            {!report ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600 shadow-sm">
                Paste logs and click <b>Analyze</b> to generate an incident report.
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                {/* Report header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold">Incident Report</div>
                    <div className="mt-1 text-xs text-zinc-600">
                      Structured output with evidence and guardrails.
                    </div>
                  </div>
                  <CopyButton text={JSON.stringify(report, null, 2)} />
                </div>

                {/* Tabs */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
                    Overview
                  </TabButton>
                  <TabButton
                    active={tab === "hypotheses"}
                    onClick={() => setTab("hypotheses")}
                  >
                    Hypotheses
                  </TabButton>
                  <TabButton active={tab === "repro"} onClick={() => setTab("repro")}>
                    Reproduction
                  </TabButton>
                  <TabButton
                    active={tab === "guardrails"}
                    onClick={() => setTab("guardrails")}
                  >
                    Guardrails
                  </TabButton>
                  <TabButton active={tab === "raw"} onClick={() => setTab("raw")}>
                    Raw JSON
                  </TabButton>
                </div>

                <div className="mt-4" />

                {/* Tab content */}
                {tab === "overview" && (
                  <div className="grid gap-4">
                    {/* Summary */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                      <div className="text-sm font-extrabold">Summary</div>
                      <div className="mt-3 grid gap-2 text-sm text-zinc-900">
                        <div>
                          <span className="font-bold">Situation:</span>{" "}
                          {report?.summary?.situation || "—"}
                        </div>
                        <div>
                          <span className="font-bold">Likely root cause:</span>{" "}
                          {report?.summary?.likelyRootCause || "—"}
                        </div>
                        <div>
                          <div className="font-bold">Immediate actions</div>
                          <ul className="mt-2 list-disc pl-6 text-sm text-zinc-900">
                            {(report?.summary?.immediateActions || []).map(
                              (a: string, i: number) => (
                                <li key={i}>{a}</li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <SignalsPanel report={report} />
                  </div>
                )}

                {tab === "hypotheses" && (
                  <div className="grid gap-3">
                    {Array.isArray(report?.hypotheses) && report.hypotheses.length > 0 ? (
                      report.hypotheses.map((h: any) => {
                        const confirm = Array.isArray(h?.evidenceToConfirm)
                          ? h.evidenceToConfirm
                          : [];
                        const falsify = Array.isArray(h?.evidenceToFalsify)
                          ? h.evidenceToFalsify
                          : [];
                        return (
                          <div
                            key={h?.rank ?? Math.random()}
                            className="rounded-2xl border border-zinc-200 bg-white p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="dark">#{String(h?.rank ?? "?")}</Badge>
                              <div className="text-sm font-extrabold">
                                {String(h?.title || "Untitled hypothesis")}
                              </div>
                              <Badge variant="muted">{String(h?.riskLevel || "UNKNOWN")}</Badge>
                            </div>

                            <div className="mt-3 text-sm text-zinc-900">
                              <span className="font-bold">Rationale:</span>{" "}
                              {String(h?.rationale || "—")}
                            </div>

                            <div className="mt-3 grid gap-3 lg:grid-cols-2">
                              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                                <div className="text-xs font-extrabold">Evidence to confirm</div>
                                <ul className="mt-2 list-disc pl-6 text-xs text-zinc-900">
                                  {confirm.map((x: string, i: number) => (
                                    <li key={i}>{x}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                                <div className="text-xs font-extrabold">Evidence to falsify</div>
                                <ul className="mt-2 list-disc pl-6 text-xs text-zinc-900">
                                  {falsify.map((x: string, i: number) => (
                                    <li key={i}>{x}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
                        No hypotheses returned.
                      </div>
                    )}
                  </div>
                )}

                {tab === "repro" && (
                  <div className="grid gap-4">
                    <div>
                      <div className="mb-2 text-xs font-extrabold text-zinc-800">
                        Reproduction plan
                      </div>
                      <JsonBlock value={report?.reproductionPlan} />
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-extrabold text-zinc-800">
                        Fault injection checklist
                      </div>
                      <JsonBlock value={report?.faultInjectionChecklist} />
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-extrabold text-zinc-800">
                        Regression tests
                      </div>
                      <JsonBlock value={report?.regressionTests} />
                    </div>
                  </div>
                )}

                {tab === "guardrails" && (
                  <div className="grid gap-4">
                    <div>
                      <div className="mb-2 text-xs font-extrabold text-zinc-800">
                        Observability gaps
                      </div>
                      <JsonBlock value={report?.observabilityGaps} />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-extrabold text-zinc-800">
                        Preventative guardrails
                      </div>
                      <JsonBlock value={report?.preventativeGuardrails} />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-extrabold text-zinc-800">
                        Safety & unknowns
                      </div>
                      <JsonBlock value={report?.safety} />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-extrabold text-zinc-800">Citations</div>
                      <JsonBlock value={report?.citations} />
                    </div>
                  </div>
                )}

                {tab === "raw" && <JsonBlock value={report} />}

                <div className="mt-5 text-xs text-zinc-500">
                  Note: MVP for internal engineering use. Always avoid pasting secrets/PII.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
