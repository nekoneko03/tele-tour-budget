import { describe, expect, it } from "vitest";

import { buildShareUrl } from "../lib/share-url";

describe("share URL", () => {
  const params = new URLSearchParams({
    region: "kansai",
    shows: "osaka-day1,osaka-day2",
  });

  it("uses the configured public site URL when available", () => {
    expect(
      buildShareUrl(
        params,
        "http://127.0.0.1:3210/?old=value#result",
        "https://trip.example.com/",
      ),
    ).toBe(
      "https://trip.example.com/?region=kansai&shows=osaka-day1%2Cosaka-day2",
    );
  });

  it("uses the current page when no public site URL is configured", () => {
    expect(
      buildShareUrl(
        params,
        "https://preview.example.com/simulator?old=value#result",
      ),
    ).toBe(
      "https://preview.example.com/simulator?region=kansai&shows=osaka-day1%2Cosaka-day2",
    );
  });

  it("falls back to the current page for an invalid or unsafe setting", () => {
    expect(
      buildShareUrl(
        params,
        "https://preview.example.com/",
        "javascript:alert(1)",
      ),
    ).toBe(
      "https://preview.example.com/?region=kansai&shows=osaka-day1%2Cosaka-day2",
    );
  });
});
