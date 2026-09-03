/**
 * Keeps the hotel-rate field pleasant to edit while keeping calculations and
 * shared URLs safe. In particular, an empty field is a valid in-progress UI
 * value and means zero yen only when it is consumed.
 */
export function parseNonNegativeNumber(
  value: string | null,
  fallback: number,
  integer = false,
): number {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return integer ? Math.max(1, Math.round(parsed)) : parsed;
}

/** Parse the URL value, retaining the normal default for missing or bad URLs. */
export function hotelRateFromUrl(value: string | null): number {
  return parseNonNegativeNumber(value, 8_000);
}

/** An empty or invalid in-progress field must never make the budget invalid. */
export function hotelRateForCalculation(value: string): number {
  return parseNonNegativeNumber(value, 0);
}
