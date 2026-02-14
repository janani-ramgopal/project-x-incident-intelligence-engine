// src/core/standards/retrieve.ts

import fs from "fs";
import path from "path";
import type { Citation, StackId } from "@/core/types";

export interface RetrieveStandardsInput {
  stack: StackId;
  text: string;
  maxSnippets?: number;
}

const LIBRARY_DIR = path.join(__dirname, "library");
const DOC_FILES = [
  "incident-process.md",
  "reliability.md",
  "security.md",
  "performance.md",
];

export function readMarkdownDocs(): Record<string, string> {
  const docs: Record<string, string> = {};
  for (const file of DOC_FILES) {
    const filePath = path.join(LIBRARY_DIR, file);
    try {
      docs[file] = fs.readFileSync(filePath, "utf8");
    } catch {
      docs[file] = "";
    }
  }
  return docs;
}

export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter(Boolean)
  );
}

export function scoreDocByKeywordOverlap(doc: string, query: string): number {
  const docTokens = tokenize(doc);
  const queryTokens = tokenize(query);
  let overlap = 0;
  for (const token of queryTokens) {
    if (docTokens.has(token)) overlap++;
  }
  return overlap;
}

export function findBestSnippet(doc: string, query: string, maxLen = 300): string {
  const sentences = doc.split(/(?<=[.?!])\s+/);
  const queryTokens = tokenize(query);
  let bestScore = -1;
  let bestSnippet = "";

  for (const sentence of sentences) {
    const sentTokens = tokenize(sentence);
    let overlap = 0;
    for (const token of queryTokens) {
      if (sentTokens.has(token)) overlap++;
    }
    if (overlap > bestScore && sentence.trim().length > 0) {
      bestScore = overlap;
      bestSnippet = sentence;
    }
  }

  if (!bestSnippet) bestSnippet = doc.slice(0, maxLen);
  return bestSnippet.length > maxLen ? bestSnippet.slice(0, maxLen) : bestSnippet;
}

export async function retrieveStandardsSnippets(
  input: RetrieveStandardsInput
): Promise<Citation[]> {
  const { text, maxSnippets = 3 } = input;
  const docs = readMarkdownDocs();

  // Score and sort docs
  const scored = Object.entries(docs)
    .map(([doc, content]) => ({
      doc,
      content,
      score: scoreDocByKeywordOverlap(content, text),
    }))
    .filter(({ content }) => content.trim().length > 0)
    .sort((a, b) => b.score - a.score);

  // Take top N
  const top = scored.slice(0, maxSnippets);

  // Extract best snippet from each
  const citations: Citation[] = top.map(({ doc, content }) => ({
    source: "standards",
    doc,
    snippet: findBestSnippet(content, text),
  }));

  return citations;
}
