import type { StackId } from "../types";

export function isStackId(v: unknown): v is StackId {
  return v === "node" || v === "java";
}