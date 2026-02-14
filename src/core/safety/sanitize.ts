// src/core/safety/sanitize.ts

const SECRET_PATTERNS = [
    // Authorization Bearer (keep scheme)
    { label: "authorization_bearer", regex: /Authorization:\s*Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/gi },
  
    // Common query/header style secrets: token=, apikey=, api_key=, password=
    { label: "token", regex: /\btoken\s*=\s*([^\s&]+)/gi },
    { label: "apikey", regex: /\bapi[-_]?key\s*=\s*([^\s&]+)/gi },
    { label: "password", regex: /\bpassword\s*=\s*([^\s&]+)/gi },
  
    // Header-style API keys (common in enterprise)
    { label: "x-api-key", regex: /\bX-API-KEY:\s*[^\s]+/gi },
    { label: "api-key-header", regex: /\bAPI-KEY:\s*[^\s]+/gi },
  ];
  
  // Simple email pattern: something@something.something
  const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi;
  
  // Staff IDs
  const STAFF_ID_SC_REGEX = /\bSC\d{5}\b/g; // SC12345
  const STAFF_ID_S_REGEX = /\bS\d{6}\b/g;   // S123456
  
  // IPv4 address pattern (conservative)
  const IPV4_REGEX =
    /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
  
  // Card numbers (PAN): 13–19 digits with optional spaces/dashes
  const CARD_CANDIDATE_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;
  
  function luhnValid(digits: string): boolean {
    let sum = 0;
    let doubleIt = false;
  
    for (let i = digits.length - 1; i >= 0; i--) {
      const n = digits.charCodeAt(i) - 48;
      if (n < 0 || n > 9) return false;
  
      let add = n;
      if (doubleIt) {
        add = n * 2;
        if (add > 9) add -= 9;
      }
      sum += add;
      doubleIt = !doubleIt;
    }
    return sum % 10 === 0;
  }
  
  export function sanitizeInputText(text: string): { sanitized: string; redactions: string[] } {
    let sanitized = text ?? "";
    const redactions = new Set<string>();
  
    if (!sanitized) {
      return { sanitized: "", redactions: [] };
    }
  
    // 1) Redact secrets
    for (const { label, regex } of SECRET_PATTERNS) {
      sanitized = sanitized.replace(regex, () => {
        redactions.add(label);
        if (label === "authorization_bearer") return "Authorization: Bearer ****REDACTED****";
        // Keep header keys readable but safe:
        if (label.includes("header") || label.includes("x-api-key")) return `${label.toUpperCase()}: ****REDACTED****`;
        return `[REDACTED ${label}]`;
      });
    }
  
    // 2) Redact emails
    sanitized = sanitized.replace(EMAIL_REGEX, () => {
      redactions.add("email");
      return "[REDACTED email]";
    });
  
    // 3) Mask staff IDs
    sanitized = sanitized.replace(STAFF_ID_SC_REGEX, () => {
      redactions.add("staff_id_sc");
      return "SCxxxxx";
    });
  
    sanitized = sanitized.replace(STAFF_ID_S_REGEX, () => {
      redactions.add("staff_id_s");
      return "Sxxxxxx";
    });
  
    // 4) Mask IPv4 addresses
    sanitized = sanitized.replace(IPV4_REGEX, () => {
      redactions.add("ip_v4");
      return "x.x.x.x";
    });
  
    // 5) Mask card numbers (PAN) with Luhn check
    sanitized = sanitized.replace(CARD_CANDIDATE_REGEX, (match) => {
      const digits = match.replace(/[^\d]/g, "");
      if (digits.length < 13 || digits.length > 19) return match;
  
      // Optional: avoid masking obvious non-cards like long timestamps (often fail Luhn anyway)
      if (!luhnValid(digits)) return match;
  
      redactions.add("card_number");
      return "****MASKED_CARD****";
    });
  
    return {
      sanitized,
      redactions: Array.from(redactions),
    };
  }
  