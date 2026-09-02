import { describe, expect, it } from "vitest";

import {
  calculateTourBudget,
  DRINK_FEE_PER_SHOW,
  generateRouteOptions,
  groupSelectedShowsIntoTrips,
  TICKET_AND_FEE_PER_SHOW,
} from "../lib/calculator";
import { shows, venues, type TourShow } from "../lib/data";

function show(id: string) {
  const found = shows.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing fixture: ${id}`);
  return found;
}

describe("tour budget calculator", () => {
  it("returns zero totals for an empty selection", () => {
    const result = calculateTourBudget({
      selectedShows: [],
      originRegionId: "kansai",
    });

    expect(result).toMatchObject({
      showCount: 0,
      tripCount: 0,
      ticketAndFee: 0,
      drink: 0,
      transport: 0,
      lodging: 0,
      total: 0,
    });
    expect(result.trips).toEqual([]);
  });

  it("groups consecutive same-city shows into one trip without doubling transport", () => {
    const selectedShows = [
      show("2027-06-12-comtec-portbase-day1"),
      show("2027-06-13-comtec-portbase-day2"),
    ];
    const trips = groupSelectedShowsIntoTrips(selectedShows, "kansai");
    const result = calculateTourBudget({
      selectedShows,
      originRegionId: "kansai",
      tripOverrides: {
        [trips[0].id]: { transportCost: 24_000 },
      },
    });

    expect(trips).toHaveLength(1);
    expect(trips[0].shows).toHaveLength(2);
    expect(result.tripCount).toBe(1);
    expect(result.transport).toBe(24_000);
    expect(result.transport).toBe(result.trips[0].transportCost);
    expect(result.trips[0].nights).toBeGreaterThanOrEqual(1);
    expect(result.trips[0].ticketAndFee).toBe(2 * TICKET_AND_FEE_PER_SHOW);
    expect(result.trips[0].drink).toBe(2 * DRINK_FEE_PER_SHOW);
  });

  it("does not group same-city shows on separated dates", () => {
    const first = show("2027-06-12-comtec-portbase-day1");
    const separated = {
      ...first,
      id: "synthetic-nagoya-later",
      date: "2027-06-20",
    } satisfies TourShow;

    const trips = groupSelectedShowsIntoTrips([first, separated], "kansai");

    expect(trips).toHaveLength(2);
    expect(trips.map((trip) => trip.shows)).toEqual([[first], [separated]]);
  });

  it("uses fixed 7,800 yen ticket-and-fee and 700 yen drink amounts per show", () => {
    const selectedShows = [
      show("2027-03-22-k-arena-yokohama"),
      show("2027-05-15-zepp-osaka-bayside-day2"),
    ];
    const result = calculateTourBudget({
      selectedShows,
      originRegionId: "kansai",
    });

    expect(result.showCount).toBe(2);
    expect(result.ticketAndFee).toBe(15_600);
    expect(result.drink).toBe(1_400);
  });

  it("exposes a per-trip breakdown whose parts sum exactly to its total", () => {
    const selectedShows = [show("2027-03-22-k-arena-yokohama")];
    const grouped = groupSelectedShowsIntoTrips(selectedShows, "kanto");
    const result = calculateTourBudget({
      selectedShows,
      originRegionId: "kanto",
      hotelNightlyRate: 3_000,
      tripOverrides: {
        [grouped[0].id]: { transportCost: 1_000, nights: 2 },
      },
    });
    const trip = result.trips[0];

    expect(trip).toMatchObject({
      ticketAndFee: 7_800,
      drink: 700,
      transportCost: 1_000,
      nights: 2,
      lodgingCost: 6_000,
      total: 15_500,
      carPartySize: 1,
    });
    expect(trip.total).toBe(
      trip.ticketAndFee + trip.drink + trip.transportCost + trip.lodgingCost,
    );
    expect(result.total).toBe(
      result.trips.reduce((sum, item) => sum + item.total, 0),
    );
  });

  it("supports different car party sizes for separate trips", () => {
    const selectedShows = [
      show("2027-04-17-zepp-fukuoka-day2"),
      show("2027-06-12-comtec-portbase-day1"),
    ];
    const trips = groupSelectedShowsIntoTrips(selectedShows, "kansai");
    const result = calculateTourBudget({
      selectedShows,
      originRegionId: "kansai",
      tripOverrides: {
        [trips[0].id]: {
          mode: "car",
          transportCost: 24_000,
          carPartySize: 2,
        },
        [trips[1].id]: {
          mode: "car",
          transportCost: 24_000,
          carPartySize: 4,
        },
      },
    });

    expect(result.trips.map((trip) => trip.carPartySize)).toEqual([2, 4]);
    expect(result.trips.map((trip) => trip.transportCost)).toEqual([
      12_000,
      6_000,
    ]);
    expect(result.transport).toBe(18_000);
  });

  it("rejects an invalid per-trip car party size", () => {
    const selectedShows = [show("2027-06-12-comtec-portbase-day1")];
    const trip = groupSelectedShowsIntoTrips(selectedShows, "kansai")[0];

    expect(() =>
      calculateTourBudget({
        selectedShows,
        originRegionId: "kansai",
        tripOverrides: {
          [trip.id]: { mode: "car", carPartySize: 0 },
        },
      }),
    ).toThrow(/carPartySize/);
  });

  it("does not offer car travel between Hokkaido and mainland Japan", () => {
    const sapporo = venues.find((venue) => venue.id === "zepp-sapporo");
    if (!sapporo) throw new Error("Missing Sapporo venue fixture");

    const car = generateRouteOptions("kanto", sapporo).find(
      (option) => option.mode === "car",
    );

    expect(car?.available).toBe(false);
  });

  it("uses the Tokyo–Niigata Shinkansen round-trip estimate in both directions", () => {
    const niigata = venues.find((venue) => venue.id === "niigata-lots");
    const yokohama = venues.find((venue) => venue.id === "k-arena-yokohama");
    if (!niigata || !yokohama) throw new Error("Missing venue fixture");

    const outbound = generateRouteOptions("kanto", niigata).find(
      (option) => option.mode === "rail",
    );
    const reverse = generateRouteOptions("koshinetsu", yokohama).find(
      (option) => option.mode === "rail",
    );

    expect(outbound?.cost).toEqual({
      min: 17_280,
      typical: 21_600,
      max: 25_920,
    });
    expect(reverse?.cost).toEqual(outbound?.cost);
  });

  it("keeps the generic rail estimate for other adjacent regions", () => {
    const nagoya = venues.find((venue) => venue.id === "comtec-portbase");
    if (!nagoya) throw new Error("Missing Nagoya venue fixture");

    const rail = generateRouteOptions("kansai", nagoya).find(
      (option) => option.mode === "rail",
    );

    expect(rail?.cost.typical).toBe(11_200);
  });
});
