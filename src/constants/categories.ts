/**
 * Categorie di spesa di default.
 *
 * `id` è una chiave logica stabile (non localizzata): viene usata come
 * valore salvato in DB, come chiave i18n per il nome visualizzato e come
 * categoria restituita dal LLM. La lista fissa del LLM è definita in
 * `src/constants/llmPrompts.ts` e deve restare allineata a questi id.
 */
import { Category } from '@/types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'food', color: '#2E8B57', icon: 'cart', isCustom: false },
  { id: 'transport', name: 'transport', color: '#1E88E5', icon: 'car', isCustom: false },
  { id: 'housing', name: 'housing', color: '#8E24AA', icon: 'home', isCustom: false },
  { id: 'health', name: 'health', color: '#D32F2F', icon: 'medkit', isCustom: false },
  { id: 'entertainment', name: 'entertainment', color: '#FFB800', icon: 'game-controller', isCustom: false },
  { id: 'work', name: 'work', color: '#546E7A', icon: 'briefcase', isCustom: false },
  { id: 'other', name: 'other', color: '#6C757D', icon: 'ellipsis-horizontal', isCustom: false },
];

/** Categoria assegnata quando il LLM non è raggiungibile (offline). */
export const UNCATEGORIZED_ID = 'other';
