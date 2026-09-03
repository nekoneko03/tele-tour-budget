import type { RegionId, TourShow, Venue } from "./data";
import { venues } from "./data";
import { getRailFare } from "./rail-fares";

export type TransportMode = "rail" | "flight" | "overnight_bus" | "car";

export type EstimateRange = {
  min: number;
  typical: number;
  max: number;
};

export type RouteOption = {
  mode: TransportMode;
  available: boolean;
  cost: EstimateRange;
  minutes: EstimateRange;
  nights: number;
  /** Present for static rail planning entries only. */
  originStation?: string;
  destinationStation?: string;
  routeSummary?: string;
  checkedAt?: string;
  needsReview?: boolean;
  sourceUrls?: readonly string[];
  notes?: string;
};

export type Trip = {
  id: string;
  city: string;
  prefecture: string;
  venue: Venue;
  shows: readonly TourShow[];
  routeOptions: readonly RouteOption[];
  recommendedMode: TransportMode;
};

export type TripOverride = {
  mode?: TransportMode;
  /** Round-trip cost before a car party split. */
  transportCost?: number;
  nights?: number;
  /** Number of people sharing this trip's car cost. */
  carPartySize?: number;
};

export type TourBudgetInput = {
  selectedShows: readonly TourShow[];
  originRegionId: RegionId;
  hotelNightlyRate?: number;
  tripOverrides?: Readonly<Record<string, TripOverride | undefined>>;
};

export type TripBudget = {
  trip: Trip;
  mode: TransportMode;
  ticketAndFee: number;
  drink: number;
  transportCost: number;
  nights: number;
  lodgingCost: number;
  total: number;
  carPartySize: number;
};

export type TourBudget = {
  showCount: number;
  tripCount: number;
  ticketAndFee: number;
  drink: number;
  transport: number;
  lodging: number;
  total: number;
  trips: readonly TripBudget[];
};

const TRANSPORT_MODES: readonly TransportMode[] = [
  "rail",
  "flight",
  "overnight_bus",
  "car",
];

export const TICKET_AND_FEE_PER_SHOW = 7_800;
export const DRINK_FEE_PER_SHOW = 700;

const MAINLAND_REGION_ORDER: readonly RegionId[] = [
  "hokkaido",
  "tohoku",
  "kanto",
  "koshinetsu",
  "hokuriku",
  "tokai",
  "kansai",
  "chugoku",
  "shikoku",
  "kyushu",
];

const venueById = new Map<Venue["id"], Venue>(
  venues.map((venue): [Venue["id"], Venue] => [venue.id, venue]),
);

function range(typical: number, spread: number): EstimateRange {
  return {
    min: Math.round(typical * (1 - spread)),
    typical: Math.round(typical),
    max: Math.round(typical * (1 + spread)),
  };
}

function unavailable(mode: TransportMode): RouteOption {
  return {
    mode,
    available: false,
    cost: { min: 0, typical: 0, max: 0 },
    minutes: { min: 0, typical: 0, max: 0 },
    nights: 0,
  };
}

function regionDistance(origin: RegionId, destination: RegionId): number {
  if (origin === destination) return 0;
  if (origin === "okinawa" || destination === "okinawa") return 10;

  const originIndex = MAINLAND_REGION_ORDER.indexOf(origin);
  const destinationIndex = MAINLAND_REGION_ORDER.indexOf(destination);
  return Math.max(1, Math.abs(originIndex - destinationIndex));
}

/**
 * Produces deliberately broad round-trip planning estimates. These are suitable
 * for comparing modes, not for quoting a live fare or timetable.
 */
export function generateRouteOptions(
  originRegionId: RegionId,
  venue: Venue,
): readonly RouteOption[] {
  const destinationRegionId = venue.regionId;
  const distance = regionDistance(originRegionId, destinationRegionId);
  const sameRegion = distance === 0;
  const crossesOkinawa =
    originRegionId === "okinawa" || destinationRegionId === "okinawa";
  const crossesHokkaido =
    originRegionId !== destinationRegionId &&
    (originRegionId === "hokkaido" || destinationRegionId === "hokkaido");

  const railFare = getRailFare(originRegionId, venue.id);
  const rail = railFare.available
    ? {
        mode: "rail" as const,
        available: true,
        // A static planning value, rather than a live fare range.
        cost: range(railFare.roundTripYen, 0),
        minutes: range(railFare.oneWayMinutes, 0),
        nights: railFare.oneWayMinutes >= 300 ? 1 : 0,
        originStation: railFare.originStation,
        destinationStation: railFare.destinationStation,
        routeSummary: railFare.routeSummary,
        checkedAt: railFare.checkedAt,
        needsReview: railFare.needsReview,
        sourceUrls: railFare.sourceUrls,
        notes: railFare.notes,
      }
    : {
        ...unavailable("rail"),
        originStation: railFare.originStation,
        destinationStation: railFare.destinationStation,
        routeSummary: railFare.routeSummary,
        checkedAt: railFare.checkedAt,
        needsReview: railFare.needsReview,
        sourceUrls: railFare.sourceUrls,
        notes: railFare.notes,
      };

  const flightAvailable = crossesOkinawa || crossesHokkaido || distance >= 3;
  const flightTypicalCost = 15_000 + Math.min(distance, 10) * 2_000;
  const flightTypicalMinutes = 210 + Math.min(distance, 10) * 12;
  const flight = flightAvailable
    ? {
        mode: "flight" as const,
        available: true,
        cost: range(flightTypicalCost, 0.35),
        minutes: range(flightTypicalMinutes, 0.2),
        nights: crossesOkinawa || crossesHokkaido || distance >= 5 ? 1 : 0,
      }
    : unavailable("flight");

  const busAvailable = !sameRegion && !crossesOkinawa && distance <= 6;
  const busTypicalCost = 5_000 + distance * 2_200;
  const busTypicalMinutes = 300 + distance * 75;
  const overnightBus = busAvailable
    ? {
        mode: "overnight_bus" as const,
        available: true,
        cost: range(busTypicalCost, 0.3),
        minutes: range(busTypicalMinutes, 0.15),
        nights: 0,
      }
    : unavailable("overnight_bus");

  // Driving between Hokkaido and mainland Japan requires a ferry. Ferry time
  // and fare are outside this regional model, so do not present car estimates.
  const carAvailable = !crossesOkinawa && !crossesHokkaido;
  const carTypicalCost = sameRegion ? 5_000 : 8_000 + distance * 4_000;
  const carTypicalMinutes = sameRegion ? 90 : 150 + distance * 85;
  const car = carAvailable
    ? {
        mode: "car" as const,
        available: true,
        cost: range(carTypicalCost, 0.2),
        minutes: range(carTypicalMinutes, 0.15),
        nights: distance >= 3 ? 1 : 0,
      }
    : unavailable("car");

  return [rail, flight, overnightBus, car];
}

/** Chooses a practical cost/time compromise among available route options. */
export function chooseBalancedRecommendedMode(
  options: readonly RouteOption[],
): TransportMode {
  const available = options.filter((option) => option.available);
  if (available.length === 0) {
    throw new Error("No route option is available");
  }

  return available.reduce((best, option) => {
    const score =
      option.cost.typical + option.minutes.typical * 25 + option.nights * 4_000;
    const bestScore =
      best.cost.typical + best.minutes.typical * 25 + best.nights * 4_000;
    return score < bestScore ? option : best;
  }).mode;
}

function makeTripId(firstShow: TourShow, venue: Venue): string {
  return `${firstShow.date}-${venue.city}`;
}

function daysBetween(firstDate: string, lastDate: string): number {
  const first = Date.parse(`${firstDate}T00:00:00Z`);
  const last = Date.parse(`${lastDate}T00:00:00Z`);
  return Math.max(0, Math.round((last - first) / 86_400_000));
}

export function groupSelectedShowsIntoTrips(
  selectedShows: readonly TourShow[],
  originRegionId: RegionId,
): readonly Trip[] {
  const sortedShows = [...selectedShows].sort((a, b) =>
    a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
  const grouped: TourShow[][] = [];

  for (const show of sortedShows) {
    const venue = venueById.get(show.venueId);
    if (!venue) throw new Error(`Unknown venue: ${show.venueId}`);

    const previousGroup = grouped.at(-1);
    const previousShow = previousGroup?.at(-1);
    const previousVenue = previousShow
      ? venueById.get(previousShow.venueId)
      : undefined;

    const followsPreviousDate = previousShow
      ? daysBetween(previousShow.date, show.date) <= 1
      : false;

    if (
      previousGroup &&
      previousVenue?.city === venue.city &&
      followsPreviousDate
    ) {
      previousGroup.push(show);
    } else {
      grouped.push([show]);
    }
  }

  return grouped.map((tripShows) => {
    const firstShow = tripShows[0];
    const venue = venueById.get(firstShow.venueId);
    if (!venue) throw new Error(`Unknown venue: ${firstShow.venueId}`);
    const lastShow = tripShows[tripShows.length - 1];
    const stayBetweenShows = daysBetween(firstShow.date, lastShow.date);
    const routeOptions = generateRouteOptions(originRegionId, venue).map(
      (option) => ({
        ...option,
        nights: option.available ? option.nights + stayBetweenShows : 0,
      }),
    );

    return {
      id: makeTripId(firstShow, venue),
      city: venue.city,
      prefecture: venue.prefecture,
      venue,
      shows: tripShows,
      routeOptions,
      recommendedMode: chooseBalancedRecommendedMode(routeOptions),
    };
  });
}

function nonNegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite non-negative number`);
  }
  return value;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`);
  }
  return value;
}

export function calculateTourBudget(input: TourBudgetInput): TourBudget {
  const hotelNightlyRate = nonNegative(
    input.hotelNightlyRate ?? 8_000,
    "hotelNightlyRate",
  );
  const trips = groupSelectedShowsIntoTrips(
    input.selectedShows,
    input.originRegionId,
  );

  const tripBudgets = trips.map((trip): TripBudget => {
    const override = input.tripOverrides?.[trip.id];
    const mode = override?.mode ?? trip.recommendedMode;
    const route = trip.routeOptions.find((option) => option.mode === mode);
    if (!route?.available) {
      throw new Error(`${mode} is not available for trip ${trip.id}`);
    }

    const routeCost = nonNegative(
      override?.transportCost ?? route.cost.typical,
      "transportCost",
    );
    const carPartySize = positiveInteger(
      override?.carPartySize ?? 1,
      `carPartySize (${trip.id})`,
    );
    const transportCost =
      mode === "car" ? Math.round(routeCost / carPartySize) : routeCost;
    const nights = nonNegative(override?.nights ?? route.nights, "nights");
    const lodgingCost = Math.round(nights * hotelNightlyRate);
    const ticketAndFee = trip.shows.length * TICKET_AND_FEE_PER_SHOW;
    const drink = trip.shows.length * DRINK_FEE_PER_SHOW;
    const total = ticketAndFee + drink + transportCost + lodgingCost;

    return {
      trip,
      mode,
      ticketAndFee,
      drink,
      transportCost,
      nights,
      lodgingCost,
      total,
      carPartySize,
    };
  });

  const showCount = input.selectedShows.length;
  const ticketAndFee = tripBudgets.reduce(
    (sum, trip) => sum + trip.ticketAndFee,
    0,
  );
  const drink = tripBudgets.reduce((sum, trip) => sum + trip.drink, 0);
  const transport = tripBudgets.reduce(
    (sum, trip) => sum + trip.transportCost,
    0,
  );
  const lodging = tripBudgets.reduce((sum, trip) => sum + trip.lodgingCost, 0);
  const total = tripBudgets.reduce((sum, trip) => sum + trip.total, 0);

  return {
    showCount,
    tripCount: trips.length,
    ticketAndFee,
    drink,
    transport,
    lodging,
    total,
    trips: tripBudgets,
  };
}

export const transportModes = TRANSPORT_MODES;
