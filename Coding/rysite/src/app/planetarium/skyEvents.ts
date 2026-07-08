// Eclipse dates below come from published long-range eclipse predictions
// (deterministic orbital mechanics — same source data NASA/GSFC eclipse
// catalogs draw from). Equinox/solstice dates are computed from Meeus'
// low-precision polynomial approximation, accurate to within a day.

export interface SolarEclipseEvent {
  date: string; // ISO date, YYYY-MM-DD
  type: 'Total' | 'Annular' | 'Partial';
  visibility: string;
}

export interface LunarEclipseEvent {
  date: string;
  type: 'Total' | 'Partial' | 'Penumbral';
  visibility: string;
}

export interface MeteorShower {
  name: string;
  month: number; // 1-12
  day: number;
  description: string;
}

export const SOLAR_ECLIPSES: SolarEclipseEvent[] = [
  { date: '2024-04-08', type: 'Total', visibility: 'Mexico, United States, Canada' },
  { date: '2024-10-02', type: 'Annular', visibility: 'Southern South America, South Pacific' },
  { date: '2025-03-29', type: 'Partial', visibility: 'Europe, North Africa, Eastern North America, North Atlantic' },
  { date: '2025-09-21', type: 'Partial', visibility: 'New Zealand, South Pacific, Antarctica' },
  { date: '2026-02-17', type: 'Annular', visibility: 'Antarctica, southern Africa, South America' },
  { date: '2026-08-12', type: 'Total', visibility: 'Greenland, Iceland, Spain' },
  { date: '2027-02-06', type: 'Annular', visibility: 'South America, Antarctica, West Africa' },
  { date: '2027-08-02', type: 'Total', visibility: 'North Africa, Spain, Saudi Arabia, Egypt, Yemen, Somalia' },
  { date: '2028-01-26', type: 'Annular', visibility: 'Eastern South America, Atlantic, Central Africa' },
  { date: '2028-07-22', type: 'Total', visibility: 'Australia, New Zealand' },
  { date: '2029-01-14', type: 'Partial', visibility: 'North America, Central America' },
  { date: '2029-06-12', type: 'Partial', visibility: 'Arctic, Scandinavia, Alaska, Canada' },
  { date: '2029-07-11', type: 'Partial', visibility: 'Southern Chile, southern Argentina' },
  { date: '2029-12-05', type: 'Partial', visibility: 'Southern South America, Antarctica' },
  { date: '2030-06-01', type: 'Annular', visibility: 'North Africa, Europe, Asia' },
  { date: '2030-11-25', type: 'Total', visibility: 'Southern Africa, Indian Ocean, Australia' },
];

export const LUNAR_ECLIPSES: LunarEclipseEvent[] = [
  { date: '2024-09-18', type: 'Partial', visibility: 'Americas, Europe, Africa' },
  { date: '2025-03-14', type: 'Total', visibility: 'Americas, Western Europe, Western Africa' },
  { date: '2025-09-07', type: 'Total', visibility: 'Asia, Australia, Europe, Africa' },
  { date: '2026-03-03', type: 'Total', visibility: 'Asia, Australia, Pacific, Americas' },
  { date: '2026-08-28', type: 'Partial', visibility: 'Americas, Europe, Africa' },
  { date: '2028-01-12', type: 'Partial', visibility: 'Americas, Europe, Africa' },
  { date: '2028-07-06', type: 'Partial', visibility: 'Africa, Asia, Australia' },
  { date: '2028-12-31', type: 'Total', visibility: 'Europe, Africa, Asia' },
  { date: '2029-06-26', type: 'Total', visibility: 'Americas, Europe, Africa' },
  { date: '2029-12-20', type: 'Total', visibility: 'Americas, Europe, Africa, Asia' },
  { date: '2030-06-15', type: 'Partial', visibility: 'Africa, Europe, Asia, Australia' },
  { date: '2030-12-09', type: 'Total', visibility: 'Americas, Europe, Africa, Asia' },
];

export const METEOR_SHOWERS: MeteorShower[] = [
  { name: 'Quadrantids', month: 1, day: 3, description: 'A short, sharp peak favoring observers under dark northern-hemisphere skies.' },
  { name: 'Lyrids', month: 4, day: 22, description: 'A modest but reliable shower known for occasional bright fireballs.' },
  { name: 'Eta Aquariids', month: 5, day: 5, description: 'Debris from Halley\'s Comet; best seen from the southern hemisphere before dawn.' },
  { name: 'Perseids', month: 8, day: 12, description: 'One of the year\'s most popular showers, with fast, bright meteors in warm summer nights.' },
  { name: 'Orionids', month: 10, day: 21, description: 'Another Halley\'s Comet shower, producing fast meteors with fine trains.' },
  { name: 'Leonids', month: 11, day: 17, description: 'Known for occasional meteor storms once every ~33 years; typically a modest shower otherwise.' },
  { name: 'Geminids', month: 12, day: 13, description: 'Often the year\'s best shower — prolific, colorful, and reliable.' },
  { name: 'Ursids', month: 12, day: 22, description: 'A minor shower near the winter solstice for northern-hemisphere observers.' },
];

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function findNextEvent<T extends { date: string }>(events: T[], from: Date): T | null {
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  let best: T | null = null;
  let bestTime = Infinity;
  for (const ev of events) {
    const t = parseISODate(ev.date).getTime();
    if (t >= fromDay && t < bestTime) {
      bestTime = t;
      best = ev;
    }
  }
  return best;
}

export function getNextSolarEclipse(from: Date): SolarEclipseEvent | null {
  return findNextEvent(SOLAR_ECLIPSES, from);
}

export function getNextLunarEclipse(from: Date): LunarEclipseEvent | null {
  return findNextEvent(LUNAR_ECLIPSES, from);
}

function jdToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

// Meeus, "Astronomical Algorithms," low-precision equinox/solstice formulas (valid 1000-3000 CE)
function equinoxSolsticeJDE(year: number, which: 0 | 1 | 2 | 3): number {
  const Y = (year - 2000) / 1000;
  switch (which) {
    case 0: // March equinox
      return 2451623.80984 + 365242.37404 * Y + 0.05169 * Y ** 2 - 0.00411 * Y ** 3 - 0.00057 * Y ** 4;
    case 1: // June solstice
      return 2451716.56767 + 365241.62603 * Y + 0.00325 * Y ** 2 + 0.00888 * Y ** 3 - 0.00030 * Y ** 4;
    case 2: // September equinox
      return 2451810.21715 + 365242.01767 * Y - 0.11575 * Y ** 2 + 0.00337 * Y ** 3 + 0.00078 * Y ** 4;
    case 3: // December solstice
      return 2451900.05952 + 365242.74049 * Y - 0.06223 * Y ** 2 - 0.00823 * Y ** 3 + 0.00032 * Y ** 4;
  }
}

const SEASONAL_MARKER_NAMES = ['March Equinox', 'June Solstice', 'September Equinox', 'December Solstice'] as const;

export interface SeasonalMarker {
  name: string;
  date: Date;
}

export function getNextSeasonalMarker(from: Date): SeasonalMarker {
  const candidates: SeasonalMarker[] = [];
  for (const year of [from.getFullYear(), from.getFullYear() + 1]) {
    for (let which = 0; which < 4; which++) {
      candidates.push({
        name: SEASONAL_MARKER_NAMES[which],
        date: jdToDate(equinoxSolsticeJDE(year, which as 0 | 1 | 2 | 3)),
      });
    }
  }
  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  return candidates.find(c => c.date.getTime() >= from.getTime()) ?? candidates[candidates.length - 1];
}

export interface UpcomingMeteorShower {
  name: string;
  date: Date;
  description: string;
}

export function getNextMeteorShower(from: Date): UpcomingMeteorShower {
  const candidates: UpcomingMeteorShower[] = [];
  for (const year of [from.getFullYear(), from.getFullYear() + 1]) {
    for (const shower of METEOR_SHOWERS) {
      candidates.push({
        name: shower.name,
        date: new Date(year, shower.month - 1, shower.day),
        description: shower.description,
      });
    }
  }
  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  return candidates.find(c => c.date.getTime() >= from.getTime()) ?? candidates[candidates.length - 1];
}
