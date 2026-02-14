import { z } from "zod";

const Str = z.string().catch("");            // if missing/invalid -> ""
const StrArr = z.array(z.string()).catch([]); // if missing/invalid -> []
const AnyObj = z.record(z.string(), z.any()).catch({}); // safe object fallback

const NonEmptyStr = z.string().min(1).catch("");

export const HypothesisSchema = z.object({
  rank: z.number().int().positive().catch(1),

  // make blanks impossible
  title: z.string().min(3).catch("Hypothesis (title missing)"),
  rationale: z.string().min(3).catch("Rationale missing from model output."),

  // enforce a known set (model often outputs random text otherwise)
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).catch("MEDIUM"),

  evidenceToConfirm: z.union([
    z.array(z.string()),
    z.string().transform((s) => (s ? [s] : [])),
  ]).catch([]),

  evidenceToFalsify: z.union([
    z.array(z.string()),
    z.string().transform((s) => (s ? [s] : [])),
  ]).catch([]),
});


export const IncidentReportSchema = z.object({
    summary: z
      .object({
        situation: Str,
        likelyRootCause: Str,
        immediateActions: StrArr,
      })
      .catch({ situation: "", likelyRootCause: "", immediateActions: [] }),
  
    hypotheses: z.array(HypothesisSchema).catch([]),
  
    // make these string arrays so UI always renders consistently
    reproductionPlan: StrArr,
    faultInjectionChecklist: StrArr,
    regressionTests: StrArr,
    observabilityGaps: StrArr,
    preventativeGuardrails: StrArr,
  
    // citations should be structured but tolerant
    citations: z
      .array(
        z.object({
          snippet: Str,
          source: Str.optional(),
        }).catch({ snippet: "" })
      )
      .catch([]),
  
    safety: z
      .object({
        assumptions: StrArr,
        unknowns: StrArr,
        redFlags: StrArr,
      })
      .catch({ assumptions: [], unknowns: [], redFlags: [] }),
  
    meta: AnyObj.optional(),
    debug: AnyObj.optional(),
    signals: z.array(AnyObj).catch([]),
  });
