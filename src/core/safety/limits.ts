// src/core/safety/limits.ts

export const MAX_LOG_CHARS = 20000;
export const MAX_CHANGES_CHARS = 6000;

export function truncate(text: string, max: number): { text: string; wasTruncated: boolean } {
  if (typeof text !== "string") return { text: "", wasTruncated: false };
  if (text.length > max) {
    return { text: text.slice(0, max), wasTruncated: true };
  }
  return { text, wasTruncated: false };
}

export function inputStats(params: {
  incidentSummary: string;
  logs: string;
  recentChanges: string;
}) {
  const { incidentSummary, logs, recentChanges } = params;
  const logsTrunc = truncate(logs, MAX_LOG_CHARS);
  const changesTrunc = truncate(recentChanges, MAX_CHANGES_CHARS);

  return {
    incidentSummaryLength: incidentSummary.length,
    logsLength: logs.length,
    logsTruncated: logsTrunc.wasTruncated,
    recentChangesLength: recentChanges.length,
    recentChangesTruncated: changesTrunc.wasTruncated
  };
}