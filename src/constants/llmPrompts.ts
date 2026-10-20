/**
 * Prompt e costanti per la categorizzazione LLM (Groq).
 *
 * La lista `LLM_CATEGORY_LABELS` è la lista fissa mostrata al modello; ogni
 * etichetta mappa su un id di `DEFAULT_CATEGORIES` tramite `LLM_LABEL_TO_ID`.
 * Mantenere allineate le due strutture a `src/constants/categories.ts`.
 */

/** Etichette leggibili presentate al LLM (lista fissa). */
export const LLM_CATEGORY_LABELS = [
  'Food & Groceries',
  'Transportation',
  'Housing',
  'Health',
  'Entertainment',
  'Work',
  'Other',
] as const;

export type LlmCategoryLabel = (typeof LLM_CATEGORY_LABELS)[number];

/** Mappa etichetta LLM -> id categoria interno. */
export const LLM_LABEL_TO_ID: Record<LlmCategoryLabel, string> = {
  'Food & Groceries': 'food',
  Transportation: 'transport',
  Housing: 'housing',
  Health: 'health',
  Entertainment: 'entertainment',
  Work: 'work',
  Other: 'other',
};

/** Modello Groq consigliato per la categorizzazione (free tier). */
export const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Costruisce il prompt di categorizzazione a partire da merchant e voci.
 * Il modello deve rispondere SOLO con JSON: {"category": "...", "confidence": 0.0-1.0}.
 */
export function buildCategorizationPrompt(merchant: string, items: string): string {
  return `You are an expense categorization assistant. Given a receipt text and merchant name, respond with a JSON object containing the most appropriate category from this fixed list:
${JSON.stringify(LLM_CATEGORY_LABELS)}

Rules:
- Respond ONLY with valid JSON, no explanation
- Format: {"category": "...", "confidence": 0.0-1.0}
- If uncertain, use "Other" with low confidence

Input:
Merchant: ${merchant}
Items detected: ${items}`;
}
