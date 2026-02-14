// src/core/stacks/java.ts

export const javaStackAdapter = {
    id: "java",
    failurePatterns: [
      "Deadlocks",
      "Thread pool starvation",
      "Garbage collection pressure",
      "Connection pool exhaustion",
      "Resource contention",
      "Classpath conflicts",
      "OutOfMemory errors",
      "Uncaught exceptions",
      "Slow dependency calls",
      "Race conditions",
    ],
    signalsToCheck: [
      "Thread dumps",
      "Garbage collection logs",
      "Heap usage",
      "Connection/thread pool stats",
      "Request latency",
      "Error rate",
      "CPU utilization",
      "Application logs",
    ],
    safeFixGuidelines: [
      "Set timeouts for all external calls",
      "Use bulkheads to isolate components",
      "Implement proper connection pooling",
      "Avoid blocking reactive or event loop threads",
      "Maintain logging hygiene",
      "Monitor and tune GC settings",
      "Handle exceptions explicitly",
      "Test fixes under load",
    ],
  };