// src/core/extract/logSignals.ts

export type Signal = {
    level: "ERROR" | "WARN" | "INFO" | "UNKNOWN";
    reason: string;
    line: string;
    correlationId?: string;
    timestamp?: string;
    context: string[];
  };
  
  const KEYWORDS = [
    { level: "ERROR", words: [" ERROR ", "EXCEPTION", "FAILED", "FAIL", "DENIED", "TIMEOUT", "UNAVAILABLE","ERR","ISSUE", "FAULT"] },
    { level: "WARN", words: ["WARN"] },
    { level: "INFO", words: ["NOT FOUND", "NO TICKET", "NO "] }
  ];
  
  function detectLevel(line: string): Signal["level"] {
    const l = line.toUpperCase();
    for (const { level, words } of KEYWORDS) {
      for (const word of words) {
        if (l.includes(word)) return level as Signal["level"];
      }
    }
    return "UNKNOWN";
  }
  
  function detectReason(line: string): string {
    // Return the first matching keyword as the reason
    const l = line.toUpperCase();
    for (const { words } of KEYWORDS) {
      for (const word of words) {
        if (l.includes(word)) return word.trim();
      }
    }
    return "UNKNOWN";
  }
  
  function extractCorrelationId(line: string): string | undefined {
    // Looks for [uuid] at the start of the line
    const match = line.match(/^\s*\[([0-9a-fA-F-]{32,})\]/);
    return match ? match[1] : undefined;
  }
  
  function extractTimestamp(line: string): string | undefined {
    // Looks for ISO-like timestamp at the start of the line
    const match = line.match(/^\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/);
    return match ? match[1] : undefined;
  }
  
  export function extractSignals(logs: string, windowLines = 4): Signal[] {
    const lines = logs.split(/\r?\n/);
    const signals: Signal[] = [];
  
    for (let i = 0; i < lines.length; ++i) {
      const line = lines[i];
      const l = line.toUpperCase();
      if (
        KEYWORDS.some(({ words }) => words.some(word => l.includes(word)))
      ) {
        const level = detectLevel(line);
        const reason = detectReason(line);
        const correlationId = extractCorrelationId(line);
        const timestamp = extractTimestamp(line);
  
        // Collect context lines (before and after, excluding the signal line)
        const context: string[] = [];
        for (let j = Math.max(0, i - windowLines); j < i; ++j) context.push(lines[j]);
        for (let j = i + 1; j <= Math.min(lines.length - 1, i + windowLines); ++j) context.push(lines[j]);
  
        signals.push({
          level,
          reason,
          line,
          correlationId,
          timestamp,
          context
        });
      }
    }
  
    // Return up to 25 most recent signals
    return signals.slice(-25).reverse();
  }