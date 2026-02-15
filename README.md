_**Project X – Incident Intelligence Engine**_


**1. Problem Summary**

Modern production incidents are difficult to triage due to:

•	Noisy logs

•	Incomplete context

•	Cross-stack variability (Node, Java, etc.)

•	Time pressure

•	Lack of standardized debugging workflows


Engineers often rely on manual hypothesis generation, tribal knowledge, and inconsistent processes.

This solution demonstrates how AI can be embedded into the engineering workflow to:

•	Extract meaningful signals from logs

•	Generate structured, ranked hypotheses

•	Propose reproduction strategies

•	Recommend fault injection scenarios

•	Suggest regression tests

•	Surface observability gaps and preventative guardrails


**The goal is not to replace engineers, but to accelerate structured thinking and enforce best practices by default.**
________________________________________

**2. Solution Approach and Architecture**

The system is built as a stack-agnostic AI-assisted incident analysis engine.


_High-level flow:_

Client (Next.js UI)  ->  API Route (/api/analyze)  -> Sanitization + Redaction Layer -> Stack Detection + Signal Extraction -> Policy Engine + Standards Retrieval -> LLM Prompt Builder -> OpenAI API -> Zod Validation + Normalization -> Structured Incident Report (JSON)


_Key architectural decisions:_

•	Stack adapters allow support for Node.js and Java without tight coupling.

•	Policy checks and standards are retrieved before calling the LLM.

•	AI output is validated and normalized using Zod.

•	All responses are structured JSON to ensure deterministic rendering.

The architecture is modular and extensible to additional stacks or enterprise standards.


________________________________________

**3. How Best Practices and Processes Are Embedded**

Best practices are embedded at multiple layers:
1.	_Sanitization Layer_
	
        o	Redacts staff IDs, IP addresses, emails, card numbers, tokens.
  	
        o	Prevents sensitive data leakage to the model.

2.	_Policy Engine_
	
        o	Flags risky patterns (e.g., unsafe logging, error handling gaps).
  	
        o	Surfaces findings as structured policy inputs.

3.	_Stack Adapters_
	
        o	Define failure patterns and signals per stack.
  	
        o	Encode safe fix guidelines.

4.	_Structured Output Schema (Zod)_
	
        o	Enforces required fields.
   	
        o	Prevents malformed AI responses.
   	
        o	Normalizes inconsistent model output.

5.	_Hypothesis-driven model design_
	
        o	Requires ranked hypotheses.
   	
        o	Requires confirm/falsify evidence.
   	
        o	Encourages evidence-based debugging.

The system makes “**doing the right thing**” the default behavior.

________________________________________

**4. How AI Is Used and Controlled**

AI is used for reasoning and structured synthesis, not for raw execution.

_AI responsibilities:_

•	Generate ranked hypotheses

•	Propose reproduction strategies

•	Suggest fault injection tests

•	Identify guardrails and observability gaps

_Control mechanisms:_

•	Strict system prompt requiring JSON-only output

•	Schema validation with Zod

•	Output normalization

•	Log truncation limits

•	Explicit safety fields (assumptions, unknowns, red flags)

•	No external browsing or uncontrolled context

The AI operates within bounded, sanitized context.

________________________________________

**5. Assumptions, Trade-offs, and Limitations**

_Assumptions:_

•	Engineers review AI output before action.

•	The model has sufficient context to reason about the incident.

_Trade-offs:_

•	LLM-based reasoning may increase latency.

•	Heuristic stack detection may not be perfect.

•	JSON enforcement reduces flexibility but increases reliability.

_Limitations:_

•	No persistent storage.

•	No vector-based RAG yet.

•	No real-time log ingestion.

•	Model quality depends on prompt design.

•	Not integrated with CI/CD or observability tools.

This is an extensible MVP designed to demonstrate architectural capability.

________________________________________

**6. Instructions to Run the Solution**

1. Install dependencies

Clone the GIT Repository and go to the project ROOT folder

execute "npm install"

2. Create environment file
 
Create .env.local on the project ROOT folder

OPENAI_API_KEY=your_api_key_here

OPENAI_MODEL=gpt-4o-mini

3. Go to the project ROOT folder and Run locally

execute "npm run dev"

_Open:_

http://localhost:3000

Paste logs and generate an incident report.

