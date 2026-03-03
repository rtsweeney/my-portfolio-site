// Constellation data with Right Ascension (hours) and Declination (degrees)
// RA/Dec represent the approximate center of each constellation
// Stars are the brightest stars with their relative positions for rendering

export interface ConstellationStar {
  name: string;
  ra: number;   // hours
  dec: number;  // degrees
  mag: number;  // apparent magnitude (lower = brighter)
}

export interface ConstellationLine {
  from: number; // index into stars array
  to: number;
}

export interface Constellation {
  name: string;
  abbreviation: string;
  ra: number;       // center RA in hours
  dec: number;      // center Dec in degrees
  description: string;
  bestMonths: number[]; // 1-12
  stars: ConstellationStar[];
  lines: ConstellationLine[];
}

export const CONSTELLATIONS: Constellation[] = [
  {
    name: 'Orion',
    abbreviation: 'Ori',
    ra: 5.58,
    dec: 0,
    description: 'The Hunter — one of the most recognizable constellations. Look for the three stars of Orion\'s Belt in a short, straight row.',
    bestMonths: [12, 1, 2, 3],
    stars: [
      { name: 'Betelgeuse', ra: 5.92, dec: 7.41, mag: 0.5 },
      { name: 'Rigel', ra: 5.24, dec: -8.20, mag: 0.13 },
      { name: 'Bellatrix', ra: 5.42, dec: 6.35, mag: 1.64 },
      { name: 'Mintaka', ra: 5.53, dec: -0.30, mag: 2.23 },
      { name: 'Alnilam', ra: 5.60, dec: -1.20, mag: 1.69 },
      { name: 'Alnitak', ra: 5.68, dec: -1.94, mag: 1.77 },
      { name: 'Saiph', ra: 5.80, dec: -9.67, mag: 2.09 },
    ],
    lines: [
      { from: 0, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
      { from: 4, to: 5 }, { from: 5, to: 6 }, { from: 6, to: 1 },
      { from: 1, to: 3 }, { from: 0, to: 5 },
    ],
  },
  {
    name: 'Ursa Major',
    abbreviation: 'UMa',
    ra: 11.06,
    dec: 55.38,
    description: 'The Great Bear — contains the famous Big Dipper asterism. The two "pointer stars" at the end of the dipper\'s bowl point toward Polaris.',
    bestMonths: [3, 4, 5, 6],
    stars: [
      { name: 'Dubhe', ra: 11.06, dec: 61.75, mag: 1.79 },
      { name: 'Merak', ra: 11.03, dec: 56.38, mag: 2.37 },
      { name: 'Phecda', ra: 11.90, dec: 53.69, mag: 2.44 },
      { name: 'Megrez', ra: 12.26, dec: 57.03, mag: 3.31 },
      { name: 'Alioth', ra: 12.90, dec: 55.96, mag: 1.77 },
      { name: 'Mizar', ra: 13.40, dec: 54.93, mag: 2.27 },
      { name: 'Alkaid', ra: 13.79, dec: 49.31, mag: 1.86 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 },
      { from: 3, to: 0 },
    ],
  },
  {
    name: 'Cassiopeia',
    abbreviation: 'Cas',
    ra: 1.0,
    dec: 60,
    description: 'The Queen — easily recognized by its distinctive "W" or "M" shape. Visible year-round in the Northern Hemisphere, circling Polaris.',
    bestMonths: [10, 11, 12, 1],
    stars: [
      { name: 'Schedar', ra: 0.67, dec: 56.54, mag: 2.23 },
      { name: 'Caph', ra: 0.15, dec: 59.15, mag: 2.27 },
      { name: 'Gamma Cas', ra: 0.95, dec: 60.72, mag: 2.47 },
      { name: 'Ruchbah', ra: 1.43, dec: 60.24, mag: 2.68 },
      { name: 'Segin', ra: 1.91, dec: 63.67, mag: 3.37 },
    ],
    lines: [
      { from: 1, to: 0 }, { from: 0, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 },
    ],
  },
  {
    name: 'Leo',
    abbreviation: 'Leo',
    ra: 10.67,
    dec: 16,
    description: 'The Lion — look for the distinctive "sickle" or backwards question mark that forms the lion\'s head and mane, with bright Regulus at the base.',
    bestMonths: [3, 4, 5, 6],
    stars: [
      { name: 'Regulus', ra: 10.14, dec: 11.97, mag: 1.35 },
      { name: 'Denebola', ra: 11.82, dec: 14.57, mag: 2.14 },
      { name: 'Algieba', ra: 10.33, dec: 19.84, mag: 2.28 },
      { name: 'Zosma', ra: 11.24, dec: 20.52, mag: 2.56 },
      { name: 'Ras Elased', ra: 10.00, dec: 23.77, mag: 2.98 },
      { name: 'Chertan', ra: 11.24, dec: 15.43, mag: 3.33 },
    ],
    lines: [
      { from: 0, to: 2 }, { from: 2, to: 4 }, { from: 2, to: 3 },
      { from: 3, to: 1 }, { from: 0, to: 5 }, { from: 5, to: 1 },
    ],
  },
  {
    name: 'Scorpius',
    abbreviation: 'Sco',
    ra: 16.9,
    dec: -30,
    description: 'The Scorpion — look for brilliant red Antares at its heart and the curving tail of stars ending in the stinger. Best seen low in the southern sky.',
    bestMonths: [6, 7, 8],
    stars: [
      { name: 'Antares', ra: 16.49, dec: -26.43, mag: 0.96 },
      { name: 'Shaula', ra: 17.56, dec: -37.10, mag: 1.63 },
      { name: 'Sargas', ra: 17.62, dec: -42.99, mag: 1.87 },
      { name: 'Dschubba', ra: 16.01, dec: -22.62, mag: 2.32 },
      { name: 'Graffias', ra: 16.09, dec: -19.81, mag: 2.62 },
      { name: 'Lesath', ra: 17.53, dec: -37.29, mag: 2.69 },
    ],
    lines: [
      { from: 4, to: 3 }, { from: 3, to: 0 }, { from: 0, to: 1 },
      { from: 1, to: 5 }, { from: 1, to: 2 },
    ],
  },
  {
    name: 'Cygnus',
    abbreviation: 'Cyg',
    ra: 20.62,
    dec: 42,
    description: 'The Swan — also known as the Northern Cross. Bright Deneb marks the tail, and the swan appears to fly along the Milky Way.',
    bestMonths: [7, 8, 9, 10],
    stars: [
      { name: 'Deneb', ra: 20.69, dec: 45.28, mag: 1.25 },
      { name: 'Sadr', ra: 20.37, dec: 40.26, mag: 2.20 },
      { name: 'Gienah', ra: 20.77, dec: 33.97, mag: 2.48 },
      { name: 'Albireo', ra: 19.51, dec: 27.96, mag: 3.08 },
      { name: 'Rukh', ra: 21.22, dec: 30.23, mag: 2.87 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 3 }, { from: 2, to: 1 },
      { from: 1, to: 4 },
    ],
  },
  {
    name: 'Lyra',
    abbreviation: 'Lyr',
    ra: 18.95,
    dec: 36.5,
    description: 'The Lyre — a compact constellation anchored by brilliant blue-white Vega, the 5th brightest star in the sky. Part of the Summer Triangle.',
    bestMonths: [6, 7, 8, 9],
    stars: [
      { name: 'Vega', ra: 18.62, dec: 38.78, mag: 0.03 },
      { name: 'Sulafat', ra: 18.98, dec: 32.69, mag: 3.24 },
      { name: 'Sheliak', ra: 18.83, dec: 33.36, mag: 3.52 },
      { name: 'Delta2 Lyr', ra: 18.91, dec: 36.90, mag: 4.30 },
    ],
    lines: [
      { from: 0, to: 3 }, { from: 3, to: 1 }, { from: 3, to: 2 },
      { from: 1, to: 2 },
    ],
  },
  {
    name: 'Gemini',
    abbreviation: 'Gem',
    ra: 7.08,
    dec: 24,
    description: 'The Twins — two parallel lines of stars topped by bright Castor and Pollux. Stands near Orion in the winter sky.',
    bestMonths: [1, 2, 3, 4],
    stars: [
      { name: 'Pollux', ra: 7.76, dec: 28.03, mag: 1.14 },
      { name: 'Castor', ra: 7.58, dec: 31.89, mag: 1.58 },
      { name: 'Alhena', ra: 6.63, dec: 16.40, mag: 1.93 },
      { name: 'Tejat', ra: 6.38, dec: 22.51, mag: 2.88 },
      { name: 'Mebsuta', ra: 6.73, dec: 25.13, mag: 2.98 },
    ],
    lines: [
      { from: 0, to: 4 }, { from: 4, to: 2 }, { from: 1, to: 3 },
      { from: 0, to: 1 },
    ],
  },
  {
    name: 'Taurus',
    abbreviation: 'Tau',
    ra: 4.7,
    dec: 17,
    description: 'The Bull — find orange Aldebaran as the bull\'s eye and the V-shaped Hyades cluster as its face. The Pleiades star cluster sits on its shoulder.',
    bestMonths: [11, 12, 1, 2, 3],
    stars: [
      { name: 'Aldebaran', ra: 4.60, dec: 16.51, mag: 0.85 },
      { name: 'Elnath', ra: 5.44, dec: 28.61, mag: 1.68 },
      { name: 'Alcyone', ra: 3.79, dec: 24.11, mag: 2.87 },
      { name: 'Tianguan', ra: 5.63, dec: 21.14, mag: 3.00 },
      { name: 'Prima Hyadum', ra: 4.33, dec: 15.63, mag: 3.65 },
    ],
    lines: [
      { from: 4, to: 0 }, { from: 0, to: 1 }, { from: 0, to: 3 },
    ],
  },
  {
    name: 'Canis Major',
    abbreviation: 'CMa',
    ra: 6.83,
    dec: -22,
    description: 'The Great Dog — home to Sirius, the brightest star in the night sky. Follows Orion across the sky as the hunter\'s faithful companion.',
    bestMonths: [12, 1, 2, 3],
    stars: [
      { name: 'Sirius', ra: 6.75, dec: -16.72, mag: -1.46 },
      { name: 'Adhara', ra: 6.98, dec: -28.97, mag: 1.50 },
      { name: 'Wezen', ra: 7.14, dec: -26.39, mag: 1.84 },
      { name: 'Mirzam', ra: 6.38, dec: -17.96, mag: 1.98 },
      { name: 'Aludra', ra: 7.40, dec: -29.30, mag: 2.45 },
    ],
    lines: [
      { from: 3, to: 0 }, { from: 0, to: 2 }, { from: 2, to: 1 },
      { from: 2, to: 4 },
    ],
  },
  {
    name: 'Aquila',
    abbreviation: 'Aql',
    ra: 19.84,
    dec: 8.5,
    description: 'The Eagle — bright Altair and its flanking stars form a distinctive line. Altair is part of the Summer Triangle with Vega and Deneb.',
    bestMonths: [7, 8, 9, 10],
    stars: [
      { name: 'Altair', ra: 19.85, dec: 8.87, mag: 0.77 },
      { name: 'Tarazed', ra: 19.77, dec: 10.61, mag: 2.72 },
      { name: 'Alshain', ra: 19.92, dec: 6.41, mag: 3.71 },
      { name: 'Theta Aql', ra: 20.19, dec: -0.82, mag: 3.23 },
      { name: 'Delta Aql', ra: 19.43, dec: 3.11, mag: 3.36 },
    ],
    lines: [
      { from: 1, to: 0 }, { from: 0, to: 2 }, { from: 0, to: 3 },
      { from: 0, to: 4 },
    ],
  },
  {
    name: 'Pegasus',
    abbreviation: 'Peg',
    ra: 22.69,
    dec: 24,
    description: 'The Winged Horse — recognized by the Great Square of Pegasus, a large square of four stars that is a key autumn landmark.',
    bestMonths: [9, 10, 11, 12],
    stars: [
      { name: 'Enif', ra: 21.74, dec: 9.87, mag: 2.39 },
      { name: 'Scheat', ra: 23.06, dec: 28.08, mag: 2.42 },
      { name: 'Markab', ra: 23.08, dec: 15.21, mag: 2.49 },
      { name: 'Algenib', ra: 0.22, dec: 15.18, mag: 2.84 },
    ],
    lines: [
      { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 0, to: 2 },
    ],
  },
  {
    name: 'Andromeda',
    abbreviation: 'And',
    ra: 0.8,
    dec: 37,
    description: 'The Chained Princess — stretches from the Great Square of Pegasus. Contains the Andromeda Galaxy (M31), visible to the naked eye on clear nights.',
    bestMonths: [10, 11, 12, 1],
    stars: [
      { name: 'Alpheratz', ra: 0.14, dec: 29.09, mag: 2.06 },
      { name: 'Mirach', ra: 1.16, dec: 35.62, mag: 2.05 },
      { name: 'Almach', ra: 2.07, dec: 42.33, mag: 2.17 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 },
    ],
  },
  {
    name: 'Perseus',
    abbreviation: 'Per',
    ra: 3.5,
    dec: 45,
    description: 'The Hero — lies between Cassiopeia and the Pleiades. Contains the famous eclipsing binary star Algol ("the Demon Star").',
    bestMonths: [11, 12, 1, 2],
    stars: [
      { name: 'Mirfak', ra: 3.41, dec: 49.86, mag: 1.79 },
      { name: 'Algol', ra: 3.14, dec: 40.96, mag: 2.12 },
      { name: 'Delta Per', ra: 3.72, dec: 47.79, mag: 3.01 },
      { name: 'Epsilon Per', ra: 3.96, dec: 40.01, mag: 2.89 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 2, to: 3 },
    ],
  },
  {
    name: 'Virgo',
    abbreviation: 'Vir',
    ra: 13.4,
    dec: -4,
    description: 'The Maiden — a large zodiac constellation with brilliant blue-white Spica as its brightest star. Best found by following the arc of the Big Dipper\'s handle.',
    bestMonths: [4, 5, 6, 7],
    stars: [
      { name: 'Spica', ra: 13.42, dec: -11.16, mag: 0.97 },
      { name: 'Porrima', ra: 12.69, dec: -1.45, mag: 2.74 },
      { name: 'Vindemiatrix', ra: 13.04, dec: 10.96, mag: 2.83 },
      { name: 'Auva', ra: 12.93, dec: 3.40, mag: 3.38 },
    ],
    lines: [
      { from: 2, to: 3 }, { from: 3, to: 1 }, { from: 1, to: 0 },
    ],
  },
  {
    name: 'Boötes',
    abbreviation: 'Boo',
    ra: 14.7,
    dec: 31,
    description: 'The Herdsman — shaped like a kite or ice cream cone. Brilliant orange Arcturus at its base is the 4th brightest star in the sky.',
    bestMonths: [4, 5, 6, 7, 8],
    stars: [
      { name: 'Arcturus', ra: 14.26, dec: 19.18, mag: -0.05 },
      { name: 'Izar', ra: 14.75, dec: 27.07, mag: 2.37 },
      { name: 'Muphrid', ra: 13.91, dec: 18.40, mag: 2.68 },
      { name: 'Nekkar', ra: 15.03, dec: 40.39, mag: 3.49 },
      { name: 'Seginus', ra: 14.53, dec: 38.31, mag: 3.03 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 4 }, { from: 4, to: 3 },
      { from: 0, to: 2 },
    ],
  },
  {
    name: 'Ursa Minor',
    abbreviation: 'UMi',
    ra: 15.0,
    dec: 78,
    description: 'The Little Bear — contains Polaris, the North Star, at the tip of its tail. Polaris sits almost exactly at the north celestial pole.',
    bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    stars: [
      { name: 'Polaris', ra: 2.53, dec: 89.26, mag: 1.98 },
      { name: 'Kochab', ra: 14.85, dec: 74.16, mag: 2.08 },
      { name: 'Pherkad', ra: 15.35, dec: 71.83, mag: 3.00 },
      { name: 'Epsilon UMi', ra: 16.77, dec: 82.04, mag: 4.23 },
      { name: 'Delta UMi', ra: 17.54, dec: 86.59, mag: 4.36 },
    ],
    lines: [
      { from: 0, to: 4 }, { from: 4, to: 3 }, { from: 3, to: 2 },
      { from: 2, to: 1 },
    ],
  },
  {
    name: 'Sagittarius',
    abbreviation: 'Sgr',
    ra: 19.1,
    dec: -28.5,
    description: 'The Archer — contains the "Teapot" asterism. When you look toward Sagittarius you are looking toward the center of the Milky Way galaxy.',
    bestMonths: [7, 8, 9],
    stars: [
      { name: 'Kaus Australis', ra: 18.40, dec: -34.38, mag: 1.85 },
      { name: 'Nunki', ra: 18.92, dec: -26.30, mag: 2.02 },
      { name: 'Ascella', ra: 19.04, dec: -29.88, mag: 2.60 },
      { name: 'Kaus Media', ra: 18.35, dec: -29.83, mag: 2.70 },
      { name: 'Kaus Borealis', ra: 18.47, dec: -25.42, mag: 2.81 },
    ],
    lines: [
      { from: 0, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 1 },
      { from: 1, to: 2 }, { from: 2, to: 0 },
    ],
  },
  {
    name: 'Auriga',
    abbreviation: 'Aur',
    ra: 6.07,
    dec: 42,
    description: 'The Charioteer — a pentagon of stars with brilliant yellow Capella. High in the sky during winter evenings in the Northern Hemisphere.',
    bestMonths: [12, 1, 2, 3],
    stars: [
      { name: 'Capella', ra: 5.27, dec: 46.00, mag: 0.08 },
      { name: 'Menkalinan', ra: 5.99, dec: 44.95, mag: 1.90 },
      { name: 'Mahasim', ra: 5.99, dec: 37.21, mag: 2.69 },
      { name: 'Hassaleh', ra: 4.95, dec: 33.17, mag: 2.69 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 0 },
    ],
  },
  {
    name: 'Corona Borealis',
    abbreviation: 'CrB',
    ra: 15.85,
    dec: 33,
    description: 'The Northern Crown — a small but beautiful semicircular arc of stars. Easy to spot between Boötes and Hercules.',
    bestMonths: [5, 6, 7, 8],
    stars: [
      { name: 'Alphecca', ra: 15.58, dec: 26.71, mag: 2.23 },
      { name: 'Nusakan', ra: 15.46, dec: 29.11, mag: 3.68 },
      { name: 'Gamma CrB', ra: 15.71, dec: 26.30, mag: 3.84 },
      { name: 'Delta CrB', ra: 15.83, dec: 26.07, mag: 4.63 },
    ],
    lines: [
      { from: 1, to: 0 }, { from: 0, to: 2 }, { from: 2, to: 3 },
    ],
  },
];

// =====================================================
// Astronomical calculation functions
// =====================================================

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Calculate Julian Day Number from a Date
 */
export function dateToJulianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;

  let Y = y;
  let M = m;
  if (M <= 2) {
    Y -= 1;
    M += 12;
  }

  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + B - 1524.5;
}

/**
 * Calculate Greenwich Mean Sidereal Time in hours
 */
export function gmst(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let theta = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T - T * T * T / 38710000.0;
  theta = ((theta % 360) + 360) % 360;
  return theta / 15.0; // convert to hours
}

/**
 * Calculate Local Sidereal Time in hours
 */
export function localSiderealTime(date: Date, longitudeDeg: number): number {
  const jd = dateToJulianDay(date);
  const gst = gmst(jd);
  let lst = gst + longitudeDeg / 15.0;
  lst = ((lst % 24) + 24) % 24;
  return lst;
}

/**
 * Convert RA/Dec to Altitude/Azimuth
 * Returns { altitude: degrees, azimuth: degrees (from North, clockwise) }
 */
export function raDecToAltAz(
  raHours: number,
  decDeg: number,
  latDeg: number,
  lst: number
): { altitude: number; azimuth: number } {
  const ha = (lst - raHours) * 15; // Hour angle in degrees
  const haRad = ha * DEG2RAD;
  const decRad = decDeg * DEG2RAD;
  const latRad = latDeg * DEG2RAD;

  // Altitude
  const sinAlt = Math.sin(decRad) * Math.sin(latRad) +
    Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const altitude = Math.asin(sinAlt) * RAD2DEG;

  // Azimuth
  const cosAz = (Math.sin(decRad) - Math.sin(altitude * DEG2RAD) * Math.sin(latRad)) /
    (Math.cos(altitude * DEG2RAD) * Math.cos(latRad));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD2DEG;

  if (Math.sin(haRad) > 0) {
    azimuth = 360 - azimuth;
  }

  return { altitude, azimuth };
}

/**
 * Get compass direction from azimuth degrees
 */
export function azimuthToCompass(azimuth: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(azimuth / 22.5) % 16;
  return dirs[index];
}

/**
 * Get a human-friendly direction description
 */
export function describeDirection(azimuth: number, altitude: number): string {
  const compass = azimuthToCompass(azimuth);

  let altDesc: string;
  if (altitude < 15) altDesc = 'very low on the horizon';
  else if (altitude < 30) altDesc = 'low in the sky';
  else if (altitude < 50) altDesc = 'midway up the sky';
  else if (altitude < 70) altDesc = 'high in the sky';
  else altDesc = 'nearly overhead';

  return `Look ${compass}, ${altDesc}`;
}

/**
 * Determine visible constellations at a given time and location.
 * Returns constellations with altitude > minAltitude degrees.
 */
export function getVisibleConstellations(
  date: Date,
  latDeg: number,
  lonDeg: number,
  minAltitude: number = 10
): Array<Constellation & { altitude: number; azimuth: number; compass: string; directionHint: string }> {
  const lst = localSiderealTime(date, lonDeg);

  return CONSTELLATIONS
    .map((c) => {
      const { altitude, azimuth } = raDecToAltAz(c.ra, c.dec, latDeg, lst);
      return {
        ...c,
        altitude,
        azimuth,
        compass: azimuthToCompass(azimuth),
        directionHint: describeDirection(azimuth, altitude),
      };
    })
    .filter((c) => c.altitude > minAltitude)
    .sort((a, b) => b.altitude - a.altitude);
}

/**
 * Project RA/Dec onto a circular sky map (stereographic projection).
 * Returns x, y in range [-1, 1] where center is zenith.
 */
export function projectToSkyMap(
  raHours: number,
  decDeg: number,
  latDeg: number,
  lst: number
): { x: number; y: number; altitude: number } | null {
  const { altitude, azimuth } = raDecToAltAz(raHours, decDeg, latDeg, lst);

  if (altitude < 0) return null;

  // Stereographic projection: radius from center = cos(alt) / (1 + sin(alt))
  // Simplified: r = (90 - alt) / 90 for a simple linear projection
  const r = (90 - altitude) / 90;
  const azRad = azimuth * DEG2RAD;

  // Azimuth 0 = North = top of map
  const x = r * Math.sin(azRad);
  const y = -r * Math.cos(azRad);

  return { x, y, altitude };
}
