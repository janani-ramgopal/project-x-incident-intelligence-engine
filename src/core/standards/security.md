# Security Standards

- Sanitize all logs to remove sensitive data.
- Never log secrets, credentials, or tokens.
- Mask or redact personally identifiable information (PII).
- Store secrets securely using environment variables or secret managers.
- Apply least privilege to all accounts and services.
- Use secure defaults for all configurations.
- Validate and sanitize all user inputs.
- Return safe, non-revealing error messages to clients.
- Regularly rotate secrets and credentials.
- Audit dependencies for known vulnerabilities.
- Review access controls and permissions periodically.