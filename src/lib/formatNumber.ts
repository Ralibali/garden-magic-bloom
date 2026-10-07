/** All user-facing kilogram values use the same Swedish precision. */
export const formatKg = (kg: number): string =>
  kg.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
