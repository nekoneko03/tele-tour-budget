import { describe, expect, it } from "vitest";

import { regions, venues } from "../lib/data";
import { getRailFare, railFares } from "../lib/rail-fares";

describe("static rail fare table", () => {
  it("covers every 11-region and 10-venue pair exactly once", () => {
    expect(railFares).toHaveLength(110);
    expect(
      new Set(railFares.map((fare) => `${fare.originRegionId}:${fare.venueId}`)).size,
    ).toBe(110);

    for (const region of regions) {
      for (const venue of venues) {
        expect(getRailFare(region.id, venue.id)).toBeDefined();
      }
    }
  });

  it("keeps representative railway planning values", () => {
    expect(getRailFare("kanto", "niigata-lots")).toMatchObject({
      originStation: "東京",
      destinationStation: "新潟",
      oneWayYen: 10_780,
      roundTripYen: 21_560,
      available: true,
    });
    expect(getRailFare("kyushu", "zepp-fukuoka")).toMatchObject({
      originStation: "博多駅",
      destinationStation: "唐人町",
      oneWayYen: 260,
      roundTripYen: 520,
      available: true,
    });
    expect(getRailFare("kanto", "k-arena-yokohama")).toMatchObject({
      originStation: "東京",
      destinationStation: "横浜",
      oneWayYen: 490,
      roundTripYen: 980,
      oneWayMinutes: 27,
      available: true,
    });
  });

  it("marks Okinawa-to-all-venues as rail unavailable", () => {
    const okinawaFares = railFares.filter(
      (fare) => fare.originRegionId === "okinawa",
    );

    expect(okinawaFares).toHaveLength(10);
    expect(okinawaFares.every((fare) => !fare.available)).toBe(true);
    expect(
      okinawaFares.every(
        (fare) =>
          fare.oneWayYen === null &&
          fare.roundTripYen === null &&
          fare.oneWayMinutes === null,
      ),
    ).toBe(true);
  });

  it("keeps every available row internally calculable", () => {
    const availableFares = railFares.filter((fare) => fare.available);

    expect(availableFares).toHaveLength(100);
    expect(
      availableFares.every(
        (fare) =>
          fare.oneWayYen >= 0 &&
          fare.roundTripYen === fare.oneWayYen * 2 &&
          fare.oneWayMinutes >= 0 &&
          fare.sourceUrls.length > 0 &&
          /^\d{4}-\d{2}-\d{2}$/.test(fare.checkedAt),
      ),
    ).toBe(true);
  });

  it("keeps the Niigata on-foot trip as a valid zero-yen rail plan", () => {
    expect(getRailFare("koshinetsu", "niigata-lots")).toMatchObject({
      available: true,
      oneWayYen: 0,
      roundTripYen: 0,
      oneWayMinutes: 15,
    });
  });
});
