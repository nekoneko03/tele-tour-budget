import { describe, expect, it } from "vitest";

import { formatShowDate, formatVenueLocation } from "../lib/display";
import { shows, venues } from "../lib/data";

describe("display helpers", () => {
  it("formats each show date with its weekday", () => {
    expect(formatShowDate(shows[0])).toBe("2027.03.22（月）");
  });

  it("formats a venue's prefecture and city in one compact label", () => {
    expect(formatVenueLocation(venues[3])).toBe("大阪府・大阪市");
  });
});
