import type { TourShow, Venue } from "./data";

export function formatShowDate(show: Pick<TourShow, "date" | "dayOfWeek">) {
  return `${show.date.replaceAll("-", ".")}（${show.dayOfWeek}）`;
}

export function formatVenueLocation(
  venue: Pick<Venue, "prefecture" | "city">,
) {
  return `${venue.prefecture}・${venue.city}`;
}
