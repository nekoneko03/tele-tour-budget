import { describe, expect, it } from "vitest";

import {
  hotelRateForCalculation,
  hotelRateFromUrl,
} from "../lib/hotel-rate";

describe("hotel rate input", () => {
  it("treats an empty in-progress field as zero only for calculation", () => {
    expect(hotelRateForCalculation("")).toBe(0);
    expect(hotelRateForCalculation("4500")).toBe(4_500);
  });

  it("preserves the normal default when a URL value is missing or invalid", () => {
    expect(hotelRateFromUrl(null)).toBe(8_000);
    expect(hotelRateFromUrl("")).toBe(8_000);
    expect(hotelRateFromUrl("not-a-number")).toBe(8_000);
    expect(hotelRateFromUrl("-500")).toBe(8_000);
  });

  it("protects calculations from invalid in-progress input", () => {
    expect(hotelRateForCalculation("-500")).toBe(0);
    expect(hotelRateForCalculation("not-a-number")).toBe(0);
  });
});
