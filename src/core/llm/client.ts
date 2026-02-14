// src/core/llm/client.ts

import { OpenAI } from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL;
console.log("OpenAI configured:", {
  hasKey: Boolean(process.env.OPENAI_API_KEY),
  model: process.env.OPENAI_MODEL,
});

if (!apiKey) {
  throw new Error("OPENAI_API_KEY environment variable is required.");
}
if (!model) {
  throw new Error("OPENAI_MODEL environment variable is required.");
}

const openai = new OpenAI({ apiKey });
export function safeParseJson(text: string): any {
  let cleaned = text.trim();

  // Remove code fences (``` or ```json ... ```)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }

  // Try to find the first '{' and last '}'
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch (err: any) {
      console.error("OpenAI error", {
        name: err?.name,
        message: err?.message,
        status: err?.status,
        code: err?.code,
        cause: err?.cause?.message,
      });
      throw err;
    }
  }

  // Fallback: try to parse the whole cleaned string
  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    console.error("OpenAI error", {
      name: err?.name,
      message: err?.message,
      status: err?.status,
      code: err?.code,
      cause: err?.cause?.message,
    });
    throw err;
  }
}

export async function callOpenAIJson(system: string, user: string): Promise<any> {
  if (!model) {
    throw new Error("Model is not defined.");
  }

  const response = await openai.chat.completions.create({
    model: model as string, // Ensure model is treated as a string
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    response_format: { type: "json_object" }
  });

  const message = response.choices[0]?.message?.content ?? "";
  return safeParseJson(message);
}