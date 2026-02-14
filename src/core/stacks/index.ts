// src/core/stacks/index.ts

import { nodeStackAdapter } from "./node";
import { javaStackAdapter } from "./java";

export type StackAdapter = {
  id: "node" | "java";
  failurePatterns: string[];
  signalsToCheck: string[];
  safeFixGuidelines: string[];
};

const adapters: Record<StackAdapter["id"], StackAdapter> = {
    node: { ...nodeStackAdapter, id: "node" },
    java: { ...javaStackAdapter, id: "java" },
};

export function getStackAdapter(stack: "node" | "java"): StackAdapter {
  return adapters[stack];
}