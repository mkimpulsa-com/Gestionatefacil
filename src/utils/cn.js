import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases de CSS de forma segura, resolviendo conflictos de Tailwind.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
