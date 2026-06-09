# ZJ-CONTEXT

## Domain Language

### Agent Sufficiency

**Definition:** The degree to which a ZCodeGraph answer gives an agent enough code understanding to continue the task without falling back to generic file-reading or text-search tools.

**Use when:** Discussing Explore output quality, context planning, benchmark goals, or whether code graph information was presented in an actionable form.

**Not:** A claim that the underlying graph contains every possible code relationship. Graph completeness can contribute to sufficiency, but it is not the same thing.

**Related terms:** Explore Answer, Read/Grep Fallback.

### Explore Answer

**Definition:** The answer that an Explore handler produces from a user's query and the current code graph. It is a bounded hypothesis about what code context the agent needs next: narrowed to a specific Evidence Scope, prioritized by Evidence Value, and subject to Output Budget and freshness constraints.

**Use when:** Discussing how Explore decides what evidence to present, how agent sufficiency is evaluated, or how benchmark failures reveal missing or mis-scoped context.

**Not:** A guarantee that every relevant code fact is present. The answer is scoped: enough to guide the next agent step under the current budget and graph state, not an exhaustive code map.

**Related terms:** Agent Sufficiency, Output Budget, Evidence Scope, Evidence Value, Read/Grep Fallback.

### Evidence Scope

**Definition:** The boundary of code evidence that an Explore Answer chooses to include. It identifies which files, symbols, relationships, source snippets, and freshness signals are sufficient to support the agent's next step.

**Use when:** Discussing why Explore included one file but excluded another, why a symbol was rendered as full source or summarized, or why a benchmark failed due to missing or mis-prioritized evidence.

**Not:** The complete set of relevant facts in the repository. Evidence Scope is intentionally bounded by the user's query, graph state, output budget, and the agent's likely next action.

**Related terms:** Explore Answer, Agent Sufficiency, Output Budget, Read/Grep Fallback.

### Output Budget

**Definition:** The limited answer capacity that an Explore Answer can spend to make its Evidence Scope useful for the agent's next step. It is allocated by evidence value, not by repository coverage: mechanism and named intent deserve more budget; redundant sibling detail, low-value files, and stale/noisy evidence should spend less.

**Use when:** Discussing why Explore renders some evidence as full source, some as skeletons, and some not at all; when diagnosing whether a planner change reduced Read/Grep Fallback; or when designing tests for budget-sensitive answers.

**Not:** A raw token, character, file-count, or section-count limit. Those are implementation constraints. Output Budget is the domain concept that explains how answer capacity should be spent under those constraints.

**Related terms:** Agent Sufficiency, Explore Answer, Evidence Scope, Read/Grep Fallback.

### Evidence Value

**Definition:** The expected contribution of a piece of code evidence to Agent Sufficiency within the current Evidence Scope and Output Budget.

**Use when:** Ranking candidate files, symbols, relationships, source snippets, or freshness signals for an Explore Answer.

**Not:** Generic relevance to the query. Evidence can be relevant but low-value if it duplicates other evidence, consumes budget without changing the agent's next action, or makes the answer larger without reducing fallback behavior.

**Related terms:** Agent Sufficiency, Evidence Scope, Output Budget, Read/Grep Fallback.

### Read/Grep Fallback

**Definition:** A visible agent behavior where, after receiving a ZCodeGraph answer, the agent still uses generic file-reading or text-search tools to recover code facts that the answer was expected to provide.

**Use when:** Classifying benchmark failures, evaluating Explore output sufficiency, or deciding whether a planner change improved the agent workflow.

**Not:** Any use of file-reading tools. Some tasks legitimately require reading source after ZCodeGraph narrows the target. A fallback only counts when the agent uses generic tools to rediscover information that should have been present in the ZCodeGraph answer.

**Related terms:** Agent Sufficiency, Explore Answer.
