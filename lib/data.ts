export type RegionId =
  | "hokkaido"
  | "tohoku"
  | "kanto"
  | "koshinetsu"
  | "hokuriku"
  | "tokai"
  | "kansai"
  | "chugoku"
  | "shikoku"
  | "kyushu"
  | "okinawa";

export type Region = {
  id: RegionId;
  label: string;
  /** Representative departure hub used by the regional route estimate. */
  hub: string;
};

export type VenueId =
  | "k-arena-yokohama"
  | "zepp-fukuoka"
  | "takamatsu-festhalle"
  | "zepp-osaka-bayside"
  | "zepp-sapporo"
  | "niigata-lots"
  | "comtec-portbase"
  | "kumamoto-b9-v1"
  | "sendai-gigs"
  | "blue-live-hiroshima";

export type Venue = {
  id: VenueId;
  name: string;
  prefecture: string;
  city: string;
  regionId: RegionId;
};

export type TicketPriceStatus = "confirmed" | "provisional";

export type TourShow = {
  id: string;
  date: `${number}-${number}-${number}`;
  dayOfWeek: string;
  holiday?: boolean;
  venueId: VenueId;
  day?: 1 | 2;
  doorsAt: string;
  startsAt: string;
  ticketPrice: number;
  ticketPriceStatus: TicketPriceStatus;
  drinkPrice?: number;
  drinkPriceStatus?: TicketPriceStatus;
};

export const officialSourceUrl = "https://tele.jp.net/live/2359/";

export const regions = [
  { id: "hokkaido", label: "北海道", hub: "札幌" },
  { id: "tohoku", label: "東北", hub: "仙台" },
  { id: "kanto", label: "関東", hub: "東京" },
  { id: "koshinetsu", label: "甲信越", hub: "新潟" },
  { id: "hokuriku", label: "北陸", hub: "金沢" },
  { id: "tokai", label: "東海", hub: "名古屋" },
  { id: "kansai", label: "関西", hub: "大阪" },
  { id: "chugoku", label: "中国", hub: "広島" },
  { id: "shikoku", label: "四国", hub: "高松" },
  { id: "kyushu", label: "九州", hub: "福岡" },
  { id: "okinawa", label: "沖縄", hub: "那覇" },
] as const satisfies readonly Region[];

export const venues = [
  {
    id: "k-arena-yokohama",
    name: "Kアリーナ横浜",
    prefecture: "神奈川県",
    city: "横浜市",
    regionId: "kanto",
  },
  {
    id: "zepp-fukuoka",
    name: "Zepp Fukuoka",
    prefecture: "福岡県",
    city: "福岡市",
    regionId: "kyushu",
  },
  {
    id: "takamatsu-festhalle",
    name: "高松festhalle",
    prefecture: "香川県",
    city: "高松市",
    regionId: "shikoku",
  },
  {
    id: "zepp-osaka-bayside",
    name: "Zepp Osaka Bayside",
    prefecture: "大阪府",
    city: "大阪市",
    regionId: "kansai",
  },
  {
    id: "zepp-sapporo",
    name: "Zepp Sapporo",
    prefecture: "北海道",
    city: "札幌市",
    regionId: "hokkaido",
  },
  {
    id: "niigata-lots",
    name: "NIIGATA LOTS",
    prefecture: "新潟県",
    city: "新潟市",
    regionId: "koshinetsu",
  },
  {
    id: "comtec-portbase",
    name: "COMTEC PORTBASE",
    prefecture: "愛知県",
    city: "名古屋市",
    regionId: "tokai",
  },
  {
    id: "kumamoto-b9-v1",
    name: "熊本B.9 V1",
    prefecture: "熊本県",
    city: "熊本市",
    regionId: "kyushu",
  },
  {
    id: "sendai-gigs",
    name: "仙台GIGS",
    prefecture: "宮城県",
    city: "仙台市",
    regionId: "tohoku",
  },
  {
    id: "blue-live-hiroshima",
    name: "BLUE LIVE 広島",
    prefecture: "広島県",
    city: "広島市",
    regionId: "chugoku",
  },
] as const satisfies readonly Venue[];

export const ticketPriceStatusLabels = {
  confirmed: "確定",
  provisional: "仮置き",
} as const satisfies Record<TicketPriceStatus, string>;

export const shows = [
  {
    id: "2027-03-22-k-arena-yokohama",
    date: "2027-03-22",
    dayOfWeek: "月",
    holiday: true,
    venueId: "k-arena-yokohama",
    doorsAt: "16:00",
    startsAt: "17:30",
    ticketPrice: 8_900,
    ticketPriceStatus: "confirmed",
    drinkPrice: 0,
    drinkPriceStatus: "confirmed",
  },
  {
    id: "2027-04-16-zepp-fukuoka-day1",
    date: "2027-04-16",
    dayOfWeek: "金",
    venueId: "zepp-fukuoka",
    day: 1,
    doorsAt: "18:00",
    startsAt: "19:00",
    ticketPrice: 6_900,
    ticketPriceStatus: "provisional",
  },
  {
    id: "2027-04-17-zepp-fukuoka-day2",
    date: "2027-04-17",
    dayOfWeek: "土",
    venueId: "zepp-fukuoka",
    day: 2,
    doorsAt: "17:00",
    startsAt: "18:00",
    ticketPrice: 6_900,
    ticketPriceStatus: "provisional",
  },
  {
    id: "2027-04-28-takamatsu-festhalle-day1",
    date: "2027-04-28",
    dayOfWeek: "水",
    venueId: "takamatsu-festhalle",
    day: 1,
    doorsAt: "18:00",
    startsAt: "19:00",
    ticketPrice: 6_900,
    ticketPriceStatus: "provisional",
  },
  {
    id: "2027-04-29-takamatsu-festhalle-day2",
    date: "2027-04-29",
    dayOfWeek: "木",
    holiday: true,
    venueId: "takamatsu-festhalle",
    day: 2,
    doorsAt: "16:00",
    startsAt: "17:00",
    ticketPrice: 6_900,
    ticketPriceStatus: "provisional",
  },
  {
    id: "2027-05-14-zepp-osaka-bayside-day1",
    date: "2027-05-14",
    dayOfWeek: "金",
    venueId: "zepp-osaka-bayside",
    day: 1,
    doorsAt: "18:00",
    startsAt: "19:00",
    ticketPrice: 6_900,
    ticketPriceStatus: "confirmed",
    drinkPrice: 600,
    drinkPriceStatus: "confirmed",
  },
  {
    id: "2027-05-15-zepp-osaka-bayside-day2",
    date: "2027-05-15",
    dayOfWeek: "土",
    venueId: "zepp-osaka-bayside",
    day: 2,
    doorsAt: "16:00",
    startsAt: "17:00",
    ticketPrice: 6_900,
    ticketPriceStatus: "confirmed",
    drinkPrice: 600,
    drinkPriceStatus: "confirmed",
  },
  {
    id: "2027-05-22-zepp-sapporo",
    date: "2027-05-22",
    dayOfWeek: "土",
    venueId: "zepp-sapporo",
    doorsAt: "17:00",
    startsAt: "18:00",
    ticketPrice: 6_900,
    ticketPriceStatus: "confirmed",
  },
  {
    id: "2027-05-28-niigata-lots-day1",
    date: "2027-05-28",
    dayOfWeek: "金",
    venueId: "niigata-lots",
    day: 1,
    doorsAt: "18:00",
    startsAt: "19:00",
    ticketPrice: 6_900,
    ticketPriceStatus: "provisional",
  },
  {
    id: "2027-05-29-niigata-lots-day2",
    date: "2027-05-29",
    dayOfWeek: "土",
    venueId: "niigata-lots",
    day: 2,
    doorsAt: "16:00",
    startsAt: "17:00",
    ticketPrice: 6_900,
    ticketPriceStatus: "provisional",
  },
  {
    id: "2027-06-12-comtec-portbase-day1",
    date: "2027-06-12",
    dayOfWeek: "土",
    venueId: "comtec-portbase",
    day: 1,
    doorsAt: "16:00",
    startsAt: "17:00",
    ticketPrice: 6_900,
    ticketPriceStatus: "provisional",
  },
  {
    id: "2027-06-13-comtec-portbase-day2",
    date: "2027-06-13",
    dayOfWeek: "日",
    venueId: "comtec-portbase",
    day: 2,
    doorsAt: "16:00",
    startsAt: "17:00",
    ticketPrice: 6_900,
    ticketPriceStatus: "provisional",
  },
  {
    id: "2027-06-18-kumamoto-b9-v1",
    date: "2027-06-18",
    dayOfWeek: "金",
    venueId: "kumamoto-b9-v1",
    doorsAt: "18:15",
    startsAt: "19:00",
    ticketPrice: 6_900,
    ticketPriceStatus: "provisional",
  },
  {
    id: "2027-06-26-sendai-gigs",
    date: "2027-06-26",
    dayOfWeek: "土",
    venueId: "sendai-gigs",
    doorsAt: "16:00",
    startsAt: "17:00",
    ticketPrice: 6_900,
    ticketPriceStatus: "provisional",
  },
  {
    id: "2027-07-10-blue-live-hiroshima-day1",
    date: "2027-07-10",
    dayOfWeek: "土",
    venueId: "blue-live-hiroshima",
    day: 1,
    doorsAt: "16:30",
    startsAt: "17:30",
    ticketPrice: 6_900,
    ticketPriceStatus: "provisional",
  },
  {
    id: "2027-07-11-blue-live-hiroshima-day2",
    date: "2027-07-11",
    dayOfWeek: "日",
    venueId: "blue-live-hiroshima",
    day: 2,
    doorsAt: "16:30",
    startsAt: "17:30",
    ticketPrice: 6_900,
    ticketPriceStatus: "provisional",
  },
] as const satisfies readonly TourShow[];
