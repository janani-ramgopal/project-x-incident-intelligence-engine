# Reliability Standards

- Set appropriate timeouts for all network and external calls.
- Implement retries with exponential backoff and jitter.
- Ensure all operations are idempotent where possible.
- Use circuit breakers to prevent cascading failures.
- Apply bulkheads to isolate failures between components.
- Detect and handle partial failures gracefully.
- Log and alert on repeated or critical failures.
- Monitor system health and error rates continuously.
- Prefer fail-fast strategies for critical dependencies.
- Regularly test failure scenarios and recovery mechanisms.
- Document reliability patterns in system design.