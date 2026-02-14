// src/core/policy/policyEngine.ts

import * as fs from "fs";
import * as path from "path";

type Severity = "LOW" | "MEDIUM" | "HIGH";

type Rule = {
  id: string;
  title: string;
  severity: Severity;
  patternHints: string[];
  recommendation: string;
};

type Finding = {
  id: string;
  title: string;
  severity: Severity;
  evidence: string;
  recommendation: string;
};

const RULES_DIR = path.join(process.cwd(), "src","core","policy","rules");

function loadRulesForStack(stack: "node" | "java"): Rule[] {
  const commonPath = path.join(RULES_DIR, "common.json");
  const stackPath = path.join(RULES_DIR, `${stack}.json`);
  const commonRules: Rule[] = JSON.parse(fs.readFileSync(commonPath, "utf8"));
  const stackRules: Rule[] = JSON.parse(fs.readFileSync(stackPath, "utf8"));
  return [...commonRules, ...stackRules];
}

export function loadRules(stack: "node" | "java"): Rule[] {
  return loadRulesForStack(stack);
}

export function runPolicyChecks(input: { stack: "node" | "java"; text: string }): Finding[] {
  const rules = loadRules(input.stack);
  const findings: Finding[] = [];
  const lowerText = input.text.toLowerCase();

  for (const rule of rules) {
    for (const hint of rule.patternHints) {
      const hintLower = hint.toLowerCase();
      const idx = lowerText.indexOf(hintLower);
      if (idx !== -1) {
        const start = Math.max(0, idx - 80);
        const end = Math.min(input.text.length, idx + hint.length + 80);
        const evidence = input.text.substring(start, end);
        findings.push({
          id: rule.id,
          title: rule.title,
          severity: rule.severity,
          evidence,
          recommendation: rule.recommendation,
        });
        break; // Only one finding per rule
      }
    }
  }
  return findings;
}