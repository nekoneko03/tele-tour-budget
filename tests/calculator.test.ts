import { describe, expect, it } from "vitest";

import {
  calculateTourBudget,
  generateRouteOptions,
  groupSelectedShowsIntoTrips,
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
      ticketBase: 0,
      drink: 0,
      userFee: 0,
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
    const result = calculateTourBudget({ selectedShows, originRegionId: "kansai" });

    expect(trips).toHaveLength(1);
    expect(trips[0].shows).toHaveLength(2);
    expect(result.tripCount).toBe(1);
    expect(result.transport).toBe(result.trips[0].transportCost);
    expect(result.trips[0].nights).toBeGreaterThanOrEqual(1);
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

  it("splits car transport among the party", () => {
    const selectedShows = [show("2027-06-12-comtec-portbase-day1")];
    const trip = groupSelectedShowsIntoTrips(selectedShows, "kansai")[0];
    const baseInput = {
      selectedShows,
      originRegionId: "kansai" as const,
      tripOverrides: {
        [trip.id]: { mode: "car" as const, transportCost: 24_000 },
      },
    };

    const solo = calculateTourBudget({ ...baseInput, carPartySize: 1 });
    const partyOfThree = calculateTourBudget({
      ...baseInput,
      carPartySize: 3,
    });

    expect(solo.transport).toBe(24_000);
    expect(partyOfThree.transport).toBe(8_000);
    expect(partyOfThree.total).toBe(solo.total - 16_000);
  });

  it("uses no drink fee for K Arena and the confirmed 600 yen fee for Osaka", () => {
    const selectedShows = [
      show("2027-03-22-k-arena-yokohama"),
      show("2027-05-15-zepp-osaka-bayside-day2"),
    ];
    const result = calculateTourBudget({
      selectedShows,
      originRegionId: "kansai",
      drinkFeePerShow: 777,
    });

    expect(result.showCount).toBe(2);
    expect(result.ticketBase).toBe(15_800);
    expect(result.drink).toBe(600);
    expect(
      calculateTourBudget({
        selectedShows: [selectedShows[0]],
        originRegionId: "kanto",
        drinkFeePerShow: 777,
      }).drink,
    ).toBe(0);
    expect(result.ticketStatusCounts).toEqual({ confirmed: 2, provisional: 0 });
    expect(result.hasProvisionalTickets).toBe(false);
  });

  it("uses the entered fallback drink fee for other livehouses", () => {
    const result = calculateTourBudget({
      selectedShows: [show("2027-04-17-zepp-fukuoka-day2")],
      originRegionId: "kyushu",
      drinkFeePerShow: 700,
    });

    expect(result.drink).toBe(700);
  });

  it("does not offer car travel between Hokkaido and mainland Japan", () => {
    const sapporo = venues.find((venue) => venue.id === "zepp-sapporo");
    if (!sapporo) throw new Error("Missing Sapporo venue fixture");

    const car = generateRouteOptions("kanto", sapporo).find(
      (option) => option.mode === "car",
    );

    expect(car?.available).toBe(false);
  });
});
