/**
 * iiitkCampusData.ts
 * Real-world geographic dataset for IIIT Kottayam (Valavoor, Kerala).
 * Derived directly from OpenStreetMap node & way geometries.
 * Includes Central Academic & Admin Zone, Student Dining & Amenities, and Main Sports Ground.
 * Hostels are excluded per operational directive.
 */

export interface CampusFacility {
  id: number;
  key: string;
  name: string;
  category: 'Central Academic & Administrative Zone' | 'Student Dining & Common Amenities' | 'Main Sports Ground';
  shortCategory: 'ACADEMIC & ADMIN' | 'DINING & AMENITIES' | 'SPORTS GROUND';
  color: string;
  center: [number, number]; // [lat, lon]
  polygon: [number, number][]; // Array of [lat, lon]
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
}

export const IIITK_FACILITIES: CampusFacility[] = [
  // ---------------------------------------------------------------------------
  // 1. Central Academic & Administrative Zone
  // ---------------------------------------------------------------------------
  {
    id: 1373453407,
    key: 'academic_1',
    name: 'Academic Block 1',
    category: 'Central Academic & Administrative Zone',
    shortCategory: 'ACADEMIC & ADMIN',
    color: '#00f0ff',
    center: [9.754904, 76.649988],
    polygon: [
      [9.7547248, 76.6502859],
      [9.7548995, 76.6502422],
      [9.7549303, 76.6502396],
      [9.7549557, 76.6502498],
      [9.7549728, 76.6502661],
      [9.7549887, 76.650289],
      [9.7550011, 76.6503014],
      [9.7551061, 76.6502752],
      [9.7551221, 76.650264],
      [9.7551326, 76.6502451],
      [9.7551398, 76.6502287],
      [9.7551608, 76.6502235],
      [9.7553302, 76.6501811],
      [9.7552504, 76.6498317],
      [9.754784, 76.6499484],
      [9.754719, 76.6499394],
      [9.7547124, 76.6499565],
      [9.7546993, 76.6499583],
      [9.7546807, 76.6499321],
      [9.7546617, 76.6499247],
      [9.7546308, 76.6499234],
      [9.7546148, 76.6499303],
      [9.7545994, 76.649943],
      [9.7545889, 76.6499576],
      [9.7545841, 76.6499781],
      [9.7546001, 76.6500211],
      [9.7546185, 76.6500365],
      [9.754638, 76.6500449],
      [9.7546657, 76.6500381],
      [9.7547248, 76.6502859]
    ],
    bounds: {
      minLat: 9.7545841,
      maxLat: 9.7553302,
      minLon: 76.6498317,
      maxLon: 76.6503014
    }
  },
  {
    id: 1373453424,
    key: 'academic_2',
    name: 'Academic Block 2',
    category: 'Central Academic & Administrative Zone',
    shortCategory: 'ACADEMIC & ADMIN',
    color: '#00e5ff',
    center: [9.755232, 76.648973],
    polygon: [
      [9.7553047, 76.6486676],
      [9.7553488, 76.6488794],
      [9.7553742, 76.6488739],
      [9.7553934, 76.6489659],
      [9.7553672, 76.6489715],
      [9.7553727, 76.648998],
      [9.7554052, 76.6489911],
      [9.7554274, 76.6490976],
      [9.7553801, 76.6491077],
      [9.7554037, 76.6492208],
      [9.7551614, 76.6492729],
      [9.7551566, 76.649263],
      [9.7551513, 76.6492247],
      [9.7551246, 76.6492305],
      [9.7551157, 76.649188],
      [9.7550484, 76.6492024],
      [9.7549647, 76.6488005],
      [9.7549864, 76.6487959],
      [9.7549605, 76.6486715],
      [9.7551701, 76.6486266],
      [9.755184, 76.6486935],
      [9.7553047, 76.6486676]
    ],
    bounds: {
      minLat: 9.7549605,
      maxLat: 9.7554274,
      minLon: 76.6486266,
      maxLon: 76.6492729
    }
  },
  {
    id: 1373453408,
    key: 'admin',
    name: 'Admin Block',
    category: 'Central Academic & Administrative Zone',
    shortCategory: 'ACADEMIC & ADMIN',
    color: '#38bdf8',
    center: [9.754938, 76.649575],
    polygon: [
      [9.7551307, 76.6497021],
      [9.7551051, 76.6497076],
      [9.7547069, 76.6497939],
      [9.7546358, 76.6494556],
      [9.7548609, 76.6494069],
      [9.7548674, 76.6494379],
      [9.7550661, 76.6493949],
      [9.7551307, 76.6497021]
    ],
    bounds: {
      minLat: 9.7546358,
      maxLat: 9.7551307,
      minLon: 76.6493949,
      maxLon: 76.6497939
    }
  },
  {
    id: 1373453414,
    key: 'oat',
    name: 'Open Area Theatre (OAT)',
    category: 'Central Academic & Administrative Zone',
    shortCategory: 'ACADEMIC & ADMIN',
    color: '#c084fc',
    center: [9.755043, 76.650634],
    polygon: [
      [9.755107, 76.650366],
      [9.7551854, 76.6505763],
      [9.7552131, 76.6505657],
      [9.7552916, 76.6506183],
      [9.7551635, 76.6508153],
      [9.7550934, 76.6507684],
      [9.7550552, 76.6507758],
      [9.7549542, 76.6508481],
      [9.7549102, 76.6508176],
      [9.7549935, 76.6507587],
      [9.7548214, 76.6507546],
      [9.7548247, 76.6506104],
      [9.7549319, 76.6504525],
      [9.7549906, 76.6504107],
      [9.755107, 76.650366]
    ],
    bounds: {
      minLat: 9.7548214,
      maxLat: 9.7552916,
      minLon: 76.650366,
      maxLon: 76.6508481
    }
  },

  // ---------------------------------------------------------------------------
  // 2. Student Dining & Common Amenities
  // ---------------------------------------------------------------------------
  {
    id: 1077351805,
    key: 'dining',
    name: 'Dining Hall & Cafeteria',
    category: 'Student Dining & Common Amenities',
    shortCategory: 'DINING & AMENITIES',
    color: '#fbbf24',
    center: [9.755678, 76.650101],
    polygon: [
      [9.7556899, 76.6499283],
      [9.7555812, 76.6499593],
      [9.7555771, 76.649975],
      [9.7554346, 76.6500064],
      [9.7554809, 76.650222],
      [9.7555502, 76.6502067],
      [9.7555719, 76.6503078],
      [9.7557068, 76.650278],
      [9.7557109, 76.6502971],
      [9.7557985, 76.6502777],
      [9.7557941, 76.6502575],
      [9.7558062, 76.6502548],
      [9.7557736, 76.6501035],
      [9.7557576, 76.650107],
      [9.7557458, 76.6500526],
      [9.755719, 76.6500585],
      [9.7557088, 76.6500115],
      [9.7557307, 76.6499933],
      [9.7557175, 76.6499458],
      [9.7556964, 76.6499518],
      [9.7556899, 76.6499283]
    ],
    bounds: {
      minLat: 9.7554346,
      maxLat: 9.7558062,
      minLon: 76.6499283,
      maxLon: 76.6503078
    }
  },
  {
    id: 1373453437,
    key: 'fitness',
    name: 'Fitness Centre / Gym',
    category: 'Student Dining & Common Amenities',
    shortCategory: 'DINING & AMENITIES',
    color: '#34d399',
    center: [9.755684, 76.649227],
    polygon: [
      [9.7556933, 76.6491412],
      [9.7556157, 76.6491635],
      [9.755669, 76.6493547],
      [9.7557466, 76.6493324],
      [9.7556933, 76.6491412]
    ],
    bounds: {
      minLat: 9.7556157,
      maxLat: 9.7557466,
      minLon: 76.6491412,
      maxLon: 76.6493547
    }
  },

  // ---------------------------------------------------------------------------
  // 3. Main Sports Ground
  // ---------------------------------------------------------------------------
  {
    id: 1373453415,
    key: 'sports_ground',
    name: 'Main Sports Ground',
    category: 'Main Sports Ground',
    shortCategory: 'SPORTS GROUND',
    color: '#4ade80',
    center: [9.754000, 76.649392],
    polygon: [
      [9.7543611, 76.6493291],
      [9.7543172, 76.6493511],
      [9.7537734, 76.6496169],
      [9.7535691, 76.6497253],
      [9.7534261, 76.6494519],
      [9.7541925, 76.6489407],
      [9.7543611, 76.6493291]
    ],
    bounds: {
      minLat: 9.7534261,
      maxLat: 9.7543611,
      minLon: 76.6489407,
      maxLon: 76.6497253
    }
  },
  {
    id: 1373453428,
    key: 'volleyball',
    name: 'Volleyball Ground',
    category: 'Main Sports Ground',
    shortCategory: 'SPORTS GROUND',
    color: '#a3e635',
    center: [9.754986, 76.651298],
    polygon: [
      [9.7549659, 76.6510614],
      [9.7552875, 76.6512165],
      [9.7550922, 76.6516337],
      [9.7547705, 76.6514786],
      [9.7548363, 76.6513382],
      [9.7549659, 76.6510614]
    ],
    bounds: {
      minLat: 9.7547705,
      maxLat: 9.7552875,
      minLon: 76.6510614,
      maxLon: 76.6516337
    }
  }
];

// Campus bounding box covering the three requested zones
export const IIITK_CAMPUS_BOUNDS = {
  southWest: [9.7532, 76.6484] as [number, number],
  northEast: [9.7562, 76.6518] as [number, number],
  center: [9.75495, 76.64995] as [number, number]
};

/**
 * Converts a normalized campus coordinate (x: 0..1000, y: 0..750)
 * to real-world GPS [latitude, longitude].
 */
export function gridToLatLng(x: number, y: number): [number, number] {
  const [minLat, minLon] = IIITK_CAMPUS_BOUNDS.southWest;
  const [maxLat, maxLon] = IIITK_CAMPUS_BOUNDS.northEast;

  // Normalized percentages
  const pctX = Math.max(0, Math.min(1000, x)) / 1000;
  const pctY = Math.max(0, Math.min(750, y)) / 750;

  // X maps to longitude (West -> East), Y maps to latitude (North -> South in SVG, so inverted)
  const lon = minLon + pctX * (maxLon - minLon);
  const lat = maxLat - pctY * (maxLat - minLat);

  return [lat, lon];
}

/**
 * Converts real-world GPS [lat, lon] to normalized grid (x: 0..1000, y: 0..750).
 */
export function latLngToGrid(lat: number, lon: number): { x: number; y: number } {
  const [minLat, minLon] = IIITK_CAMPUS_BOUNDS.southWest;
  const [maxLat, maxLon] = IIITK_CAMPUS_BOUNDS.northEast;

  const pctX = (lon - minLon) / (maxLon - minLon);
  const pctY = (maxLat - lat) / (maxLat - minLat);

  return {
    x: Math.round(Math.max(0, Math.min(1000, pctX * 1000))),
    y: Math.round(Math.max(0, Math.min(750, pctY * 750)))
  };
}
