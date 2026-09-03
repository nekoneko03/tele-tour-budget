import { regions, venues, type RegionId, type VenueId } from "./data";
import railFareRows from "./rail-fares.json";

type RailFareBase = {
  originRegionId: RegionId;
  originStation: string;
  venueId: VenueId;
  destinationStation: string;
  routeSummary: string;
  sourceUrls: readonly string[];
  checkedAt: string;
  needsReview: boolean;
  notes: string;
};

export type AvailableRailFare = RailFareBase & {
  available: true;
  oneWayYen: number;
  roundTripYen: number;
  oneWayMinutes: number;
};

export type UnavailableRailFare = RailFareBase & {
  available: false;
  oneWayYen: null;
  roundTripYen: null;
  oneWayMinutes: null;
};

export type RailFare = AvailableRailFare | UnavailableRailFare;

const regionIds = new Set<string>(regions.map((region) => region.id));
const venueIds = new Set<string>(venues.map((venue) => venue.id));
const expectedRowCount = regions.length * venues.length;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidCheckedAt(value: unknown): value is string {
  if (!isNonEmptyString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isHttpUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validationError(index: number, message: string): never {
  throw new Error(`Invalid rail fare row ${index}: ${message}`);
}

function validateRailFares(rows: unknown): readonly RailFare[] {
  if (!Array.isArray(rows) || rows.length !== expectedRowCount) {
    throw new Error(`Rail fare table must contain ${expectedRowCount} rows`);
  }

  const seen = new Set<string>();
  const validated = rows.map((row, index): RailFare => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return validationError(index, "must be an object");
    }
    const candidate = row as Record<string, unknown>;
    const { originRegionId, venueId } = candidate;
    if (!isNonEmptyString(originRegionId) || !regionIds.has(originRegionId)) {
      return validationError(index, "has an unknown originRegionId");
    }
    if (!isNonEmptyString(venueId) || !venueIds.has(venueId)) {
      return validationError(index, "has an unknown venueId");
    }
    const key = `${originRegionId}:${venueId}`;
    if (seen.has(key)) return validationError(index, `duplicates ${key}`);
    seen.add(key);

    for (const field of ["originStation", "destinationStation", "routeSummary", "notes"]) {
      if (!isNonEmptyString(candidate[field])) {
        return validationError(index, `${field} must be a non-empty string`);
      }
    }
    if (!Array.isArray(candidate.sourceUrls) || candidate.sourceUrls.length === 0 || !candidate.sourceUrls.every(isHttpUrl)) {
      return validationError(index, "sourceUrls must contain HTTP(S) URLs");
    }
    if (!isValidCheckedAt(candidate.checkedAt)) {
      return validationError(index, "checkedAt must be a real YYYY-MM-DD date");
    }
    if (typeof candidate.needsReview !== "boolean" || typeof candidate.available !== "boolean") {
      return validationError(index, "available and needsReview must be booleans");
    }

    const base: RailFareBase = {
      originRegionId: originRegionId as RegionId,
      originStation: candidate.originStation as string,
      venueId: venueId as VenueId,
      destinationStation: candidate.destinationStation as string,
      routeSummary: candidate.routeSummary as string,
      sourceUrls: candidate.sourceUrls as readonly string[],
      checkedAt: candidate.checkedAt as string,
      needsReview: candidate.needsReview,
      notes: candidate.notes as string,
    };
    if (candidate.available) {
      if (!isNonNegativeInteger(candidate.oneWayYen) || !isNonNegativeInteger(candidate.roundTripYen) || !isNonNegativeInteger(candidate.oneWayMinutes)) {
        return validationError(index, "available rows require non-negative integer fare and time values");
      }
      if (candidate.roundTripYen !== candidate.oneWayYen * 2) {
        return validationError(index, "roundTripYen must equal oneWayYen × 2");
      }
      return { ...base, available: true, oneWayYen: candidate.oneWayYen, roundTripYen: candidate.roundTripYen, oneWayMinutes: candidate.oneWayMinutes };
    }
    if (candidate.oneWayYen !== null || candidate.roundTripYen !== null || candidate.oneWayMinutes !== null) {
      return validationError(index, "unavailable rows require null fare and time values");
    }
    return { ...base, available: false, oneWayYen: null, roundTripYen: null, oneWayMinutes: null };
  });

  if (seen.size !== expectedRowCount) {
    throw new Error("Rail fare table does not cover every region and venue pair");
  }
  return validated;
}

export const railFares = validateRailFares(railFareRows);

export function railFareKey(originRegionId: RegionId, venueId: VenueId): string {
  return `${originRegionId}:${venueId}`;
}

export const railFareByOriginAndVenue: ReadonlyMap<string, RailFare> = new Map(
  railFares.map((fare) => [railFareKey(fare.originRegionId, fare.venueId), fare]),
);

export function getRailFare(
  originRegionId: RegionId,
  venueId: VenueId,
): RailFare {
  const fare = railFareByOriginAndVenue.get(railFareKey(originRegionId, venueId));
  if (!fare) {
    throw new Error(`Missing rail fare for ${originRegionId}:${venueId}`);
  }
  return fare;
}
