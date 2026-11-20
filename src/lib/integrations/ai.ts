import "server-only";

/**
 * Optional external AI provider interface for AURA.
 * No provider is implemented in v1. To add one:
 *  1. implement AIProvider (server-side only, key from env),
 *  2. send only data the current user is cleared to see — never RESTRICTED/CONFIDENTIAL content,
 *  3. tag replies as EXTERNAL_AI so users can tell them apart,
 *  4. require AI_EXTERNAL_ENABLED=true (never on by default).
 */
export interface AIProvider {
  readonly name: string;
  complete(prompt: string, opts: { userRole: string; maxTokens?: number }): Promise<string>;
}

export function getAIProvider(): AIProvider | null {
  if (process.env.AI_EXTERNAL_ENABLED !== "true" || !process.env.AI_API_KEY) return null;
  // Deliberately not implemented: enabling a paid API is an explicit future decision.
  return null;
}
