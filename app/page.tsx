"use client";

import { useEffect, useMemo, useState } from "react";

import {
  regions,
  shows,
  venues,
  type RegionId,
} from "../lib/data";
import {
  DRINK_FEE_PER_SHOW,
  TICKET_AND_FEE_PER_SHOW,
  calculateTourBudget,
  groupSelectedShowsIntoTrips,
  type TransportMode,
  type TripOverride,
} from "../lib/calculator";

const venueById = new Map(venues.map((venue) => [venue.id, venue]));
const validShowIds = new Set<string>(shows.map((show) => show.id));
const validRegionIds = new Set<RegionId>(regions.map((region) => region.id));
const modeLabels: Record<TransportMode, string> = {
  rail: "鉄道",
  flight: "飛行機",
  overnight_bus: "夜行バス",
  car: "車",
};
const validModes = new Set<TransportMode>([
  "rail",
  "flight",
  "overnight_bus",
  "car",
]);

function yen(value: number) {
  return `${Math.round(value).toLocaleString("ja-JP")}円`;
}

function safeNumber(value: string | null, fallback: number, integer = false) {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return integer ? Math.max(1, Math.round(parsed)) : parsed;
}

export default function Home() {
  const [originRegionId, setOriginRegionId] = useState<RegionId>("kansai");
  const [selectedShowIds, setSelectedShowIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [hotelNightlyRate, setHotelNightlyRate] = useState(8_000);
  const [tripOverrides, setTripOverrides] = useState<
    Record<string, TripOverride | undefined>
  >({});
  const [shareStatus, setShareStatus] = useState("");
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const region = params.get("region");
    if (region && validRegionIds.has(region as RegionId)) {
      setOriginRegionId(region as RegionId);
    }

    const showParam = params.get("shows");
    if (showParam !== null) {
      setSelectedShowIds(
        new Set(showParam.split(",").filter((id) => validShowIds.has(id))),
      );
    }

    setHotelNightlyRate(safeNumber(params.get("hotel"), 8_000));

    const parsedOverrides: Record<string, TripOverride> = {};
    for (const entry of params.getAll("trip")) {
      const [tripId, mode, nights, carPartySize] = entry.split("|");
      if (!tripId || !validModes.has(mode as TransportMode)) continue;
      const parsedNights = safeNumber(nights ?? null, Number.NaN);
      const parsedCarPartySize = safeNumber(
        carPartySize ?? null,
        Number.NaN,
        true,
      );
      parsedOverrides[tripId] = {
        mode: mode as TransportMode,
        ...(Number.isFinite(parsedNights) ? { nights: parsedNights } : {}),
        ...(Number.isFinite(parsedCarPartySize)
          ? { carPartySize: parsedCarPartySize }
          : {}),
      };
    }
    setTripOverrides(parsedOverrides);
    setUrlReady(true);
  }, []);

  const selectedShows = useMemo(
    () => shows.filter((show) => selectedShowIds.has(show.id)),
    [selectedShowIds],
  );
  const originRegion = regions.find((region) => region.id === originRegionId);
  const availableTrips = useMemo(
    () => groupSelectedShowsIntoTrips(selectedShows, originRegionId),
    [selectedShows, originRegionId],
  );
  const effectiveTripOverrides = useMemo(() => {
    const safeOverrides: Record<string, TripOverride> = {};
    for (const trip of availableTrips) {
      const override = tripOverrides[trip.id];
      if (!override) continue;
      const modeIsAvailable = trip.routeOptions.some(
        (option) => option.mode === override.mode && option.available,
      );
      safeOverrides[trip.id] = {
        ...(modeIsAvailable ? { mode: override.mode } : {}),
        ...(override.nights !== undefined ? { nights: override.nights } : {}),
        ...(override.carPartySize !== undefined &&
        Number.isInteger(override.carPartySize) &&
        override.carPartySize >= 1
          ? { carPartySize: override.carPartySize }
          : {}),
      };
    }
    return safeOverrides;
  }, [availableTrips, tripOverrides]);
  const budget = useMemo(
    () =>
      calculateTourBudget({
        selectedShows,
        originRegionId,
        hotelNightlyRate,
        tripOverrides: effectiveTripOverrides,
      }),
    [
      hotelNightlyRate,
      originRegionId,
      selectedShows,
      effectiveTripOverrides,
    ],
  );

  function toggleShow(showId: string) {
    setSelectedShowIds((current) => {
      const next = new Set(current);
      if (next.has(showId)) next.delete(showId);
      else next.add(showId);
      return next;
    });
  }

  function updateTrip(tripId: string, patch: TripOverride) {
    setTripOverrides((current) => ({
      ...current,
      [tripId]: { ...current[tripId], ...patch },
    }));
  }

  async function copyShareUrl() {
    const params = new URLSearchParams();
    params.set("region", originRegionId);
    params.set("shows", selectedShows.map((show) => show.id).join(","));
    params.set("hotel", String(hotelNightlyRate));

    for (const trip of availableTrips) {
      const override = effectiveTripOverrides[trip.id];
      const mode = override?.mode ?? trip.recommendedMode;
      const route = trip.routeOptions.find((option) => option.mode === mode);
      const nights = override?.nights ?? route?.nights;
      const carPartySize = override?.carPartySize ?? 1;
      params.append(
        "trip",
        `${trip.id}|${mode}|${nights ?? ""}|${carPartySize}`,
      );
    }

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("URLをコピーしました");
    } catch {
      setShareStatus("コピーできませんでした。ブラウザの権限をご確認ください。");
    }
  }

  return (
    <main className="simulator-shell">
      <header className="hero">
        <h1>遠征費シミュレーター</h1>
        <p className="hero-copy">
          行きたい公演と移動方法を選んで、ツアー全体の概算を組み立てます。
        </p>
      </header>

      <div className="simulator-layout">
        <div className="simulator-controls">
          <section className="panel settings-panel">
            <div className="section-heading">
              <div>
                <p className="step-label">STEP 1</p>
                <h2>出発地と共通費用</h2>
              </div>
            </div>
            <div className="field-grid">
              <label className="field field-wide">
                <span>出発地域</span>
                <select
                  value={originRegionId}
                  onChange={(event) => {
                    setOriginRegionId(event.target.value as RegionId);
                    setTripOverrides({});
                  }}
                >
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.label}（{region.hub}発の目安）
                    </option>
                  ))}
                </select>
                <small>
                  地域ごとの概算は代表拠点
                  {originRegion ? `「${originRegion.hub}」` : ""}
                  からの往復です。
                </small>
              </label>
              <div className="price-facts field-wide" aria-label="固定費用">
                <p>
                  <span>チケット＋手数料</span>
                  <strong>{yen(TICKET_AND_FEE_PER_SHOW)} / 公演</strong>
                </p>
                <p>
                  <span>ドリンク</span>
                  <strong>{yen(DRINK_FEE_PER_SHOW)} / 公演</strong>
                </p>
              </div>
              <label className="field">
                <span>ホテル代 / 泊</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={hotelNightlyRate}
                  onChange={(event) =>
                    setHotelNightlyRate(safeNumber(event.target.value, 0))
                  }
                />
              </label>
            </div>
          </section>

          <section className="panel shows-panel">
            <div className="section-heading">
              <div>
                <p className="step-label">STEP 2</p>
                <h2>行きたい公演を選ぶ</h2>
              </div>
              <div className="button-row">
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setSelectedShowIds(new Set(shows.map((show) => show.id)))
                  }
                >
                  すべて選択
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setSelectedShowIds(new Set())}
                >
                  クリア
                </button>
              </div>
            </div>
            <p className="selection-count">
              全16公演中 {selectedShows.length}公演を選択
            </p>
            <div className="show-list">
              {shows.map((show) => {
                const venue = venueById.get(show.venueId);
                return (
                  <label
                    key={show.id}
                    className={`show-option ${selectedShowIds.has(show.id) ? "is-selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedShowIds.has(show.id)}
                      onChange={() => toggleShow(show.id)}
                    />
                    <span className="show-date">
                      {show.date.replaceAll("-", ".")}（{show.dayOfWeek}）
                    </span>
                    <span className="show-venue">
                      {venue?.name}
                      {"day" in show && show.day ? ` Day ${show.day}` : ""}
                    </span>
                    <span
                      className="show-price"
                      title="チケット・手数料・ドリンクの固定概算"
                    >
                      概算 {yen(TICKET_AND_FEE_PER_SHOW + DRINK_FEE_PER_SHOW)}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          {availableTrips.length > 0 && (
            <section className="panel trips-panel">
              <div className="section-heading">
                <div>
                  <p className="step-label">STEP 3</p>
                  <h2>遠征ごとの移動・宿泊</h2>
                </div>
              </div>
              <div className="trip-list">
                {budget.trips.map(
                  ({
                    trip,
                    mode,
                    ticketAndFee,
                    drink,
                    transportCost,
                    nights,
                    lodgingCost,
                    total,
                    carPartySize,
                  }) => {
                    const chosenRoute = trip.routeOptions.find(
                      (option) => option.mode === mode,
                    );
                    return (
                      <article className="trip-card" key={trip.id}>
                        <div className="trip-card-heading">
                          <div>
                            <p className="trip-date">
                              {trip.shows[0].date.replaceAll("-", ".")}
                              {trip.shows.length > 1 &&
                                ` – ${trip.shows.at(-1)?.date.replaceAll("-", ".")}`}
                            </p>
                            <h3>{trip.city}遠征</h3>
                            <p>
                              {trip.venue.name}・{trip.shows.length}公演
                            </p>
                          </div>
                          <span className="trip-subtotal">
                            {yen(total)}
                          </span>
                        </div>
                        <div
                          className="mode-buttons"
                          role="group"
                          aria-label={`${trip.city}への移動方法`}
                        >
                          {trip.routeOptions.map((option) => (
                            <button
                              key={option.mode}
                              type="button"
                              disabled={!option.available}
                              className={`mode-button ${mode === option.mode ? "is-selected" : ""}`}
                              onClick={() =>
                                updateTrip(trip.id, {
                                  mode: option.mode,
                                  nights: option.nights,
                                })
                              }
                            >
                              <span>{modeLabels[option.mode]}</span>
                              <small>
                                {option.available
                                  ? `${option.mode === trip.recommendedMode ? "おすすめ・" : ""}往復 ${yen(option.cost.min)}〜${yen(option.cost.typical)}〜${yen(option.cost.max)}`
                                  : "対象外"}
                              </small>
                            </button>
                          ))}
                        </div>
                        <label className="field compact-field">
                          <span>宿泊数</span>
                          <select
                            value={nights}
                            onChange={(event) =>
                              updateTrip(trip.id, {
                                nights: Number(event.target.value),
                              })
                            }
                          >
                            {[0, 1, 2, 3, 4, 5].map((count) => (
                              <option key={count} value={count}>
                                {count}泊
                              </option>
                            ))}
                          </select>
                        </label>
                        {mode === "car" && (
                          <label className="field compact-field car-party-field">
                            <span>車の費用を割る人数</span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              inputMode="numeric"
                              value={carPartySize}
                              aria-label={`${trip.city}遠征で車の費用を割る人数`}
                              onChange={(event) =>
                                updateTrip(trip.id, {
                                  carPartySize: safeNumber(
                                    event.target.value,
                                    1,
                                    true,
                                  ),
                                })
                              }
                            />
                            <small>この遠征の車代だけを人数で割ります。</small>
                          </label>
                        )}
                        {chosenRoute && (
                          <p className="estimate-note">
                            おすすめ：{modeLabels[trip.recommendedMode]}。選択中の
                            {modeLabels[mode]}は、往復交通費
                            {yen(chosenRoute.cost.min)}〜
                            {yen(chosenRoute.cost.typical)}〜
                            {yen(chosenRoute.cost.max)}、所要時間
                            {chosenRoute.minutes.min}〜
                            {chosenRoute.minutes.typical}〜
                            {chosenRoute.minutes.max}分（最小・標準・最大）。ライブ運賃ではない概算です。
                          </p>
                        )}
                        <dl
                          className="trip-breakdown"
                          aria-label={`${trip.city}遠征の費用内訳`}
                        >
                          <div>
                            <dt>チケット＋手数料</dt>
                            <dd>{yen(ticketAndFee)}</dd>
                          </div>
                          <div>
                            <dt>ドリンク</dt>
                            <dd>{yen(drink)}</dd>
                          </div>
                          <div>
                            <dt>交通費</dt>
                            <dd>{yen(transportCost)}</dd>
                          </div>
                          <div>
                            <dt>宿泊費</dt>
                            <dd>{yen(lodgingCost)}</dd>
                          </div>
                          <div className="trip-breakdown-total">
                            <dt>遠征小計</dt>
                            <dd>{yen(total)}</dd>
                          </div>
                        </dl>
                      </article>
                    );
                  },
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="panel summary-panel" aria-live="polite">
          <p className="step-label">TOTAL</p>
          <h2>遠征費の概算</h2>
          <p className="grand-total">{yen(budget.total)}</p>
          <p className="summary-caption">
            {budget.showCount}公演・{budget.tripCount}遠征
          </p>
          <dl className="breakdown-list">
            <div>
              <dt>チケット＋手数料</dt>
              <dd>{yen(budget.ticketAndFee)}</dd>
            </div>
            <div>
              <dt>ドリンク</dt>
              <dd>{yen(budget.drink)}</dd>
            </div>
            <div>
              <dt>交通</dt>
              <dd>{yen(budget.transport)}</dd>
            </div>
            <div>
              <dt>宿泊</dt>
              <dd>{yen(budget.lodging)}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="primary-button"
            disabled={!urlReady}
            onClick={copyShareUrl}
          >
            この条件のURLをコピー
          </button>
          {shareStatus && <p className="share-status">{shareStatus}</p>}
        </aside>
      </div>
    </main>
  );
}
