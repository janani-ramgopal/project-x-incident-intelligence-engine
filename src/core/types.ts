// src/core/types.ts

export type StackId = "node" | "java";

export interface IncidentInput {
  readonly stack: StackId;
  readonly incidentSummary: string;
  readonly logs: string;
  readonly recentChanges?: string;
}

export interface IncidentReportMeta {
  readonly stack: StackId;
  readonly generatedAt: string; // ISO date string
  readonly confidence: number; // 0-1 or percentage
  readonly model: string;
}

export interface IncidentReportSummary {
  readonly situation: string;
  readonly likelyRootCause: string;
  readonly immediateActions: readonly string[];
}

export interface IncidentReportHypothesis {
  readonly rank: number;
  readonly title: string;
  readonly rationale: string;
  readonly evidenceToConfirm: readonly string[];
  readonly evidenceToFalsify: readonly string[];
  readonly riskLevel: "low" | "medium" | "high" | "critical";
}

export interface IncidentReportReproductionPlan {
  readonly minimalSteps: readonly string[];
  readonly environmentNotes: readonly string[];
  readonly dataSetup: readonly string[];
}

export interface IncidentReportFaultInjectionChecklist {
  readonly scenario: string;
  readonly howToInject: string;
  readonly expectedSystemBehavior: string;
  readonly signalsToWatch: readonly string[];
}

export interface IncidentReportRegressionTest {
  readonly testType: string;
  readonly description: string;
  readonly targetComponent: string;
  readonly whyItPreventsRecurrence: string;
}

export interface IncidentReportPreventativeGuardrail {
  readonly category: string;
  readonly recommendation: string;
}

export interface IncidentReportCitation {
  readonly source: string;
  readonly doc: string;
  readonly snippet: string;
}

export interface IncidentReportSafety {
  readonly assumptions: readonly string[];
  readonly unknowns: readonly string[];
  readonly redFlags: readonly string[];
}

export interface IncidentReport {
  readonly meta: IncidentReportMeta;
  readonly summary: IncidentReportSummary;
  readonly hypotheses: readonly IncidentReportHypothesis[];
  readonly reproductionPlan: IncidentReportReproductionPlan;
  readonly faultInjectionChecklist: readonly IncidentReportFaultInjectionChecklist[];
  readonly regressionTests: readonly IncidentReportRegressionTest[];
  readonly observabilityGaps: readonly string[];
  readonly preventativeGuardrails: readonly IncidentReportPreventativeGuardrail[];
  readonly citations: readonly Citation[];
  readonly safety: IncidentReportSafety;
}

export type Citation = {
  id?: string; 
  source: "standards";
  doc: string;
  snippet: string;
};