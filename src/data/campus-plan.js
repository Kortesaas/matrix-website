// Room identities and boundaries checked against “Lageplan beschriftet.png”.
// Coordinates use the existing model's normalized floor-plan space, not the
// uploaded image's pixels. Heights and furniture remain illustrative.
export const PLAN_SCALE = 1 / 42;
export const planX = (x) => (x - 1005) * PLAN_SCALE;
export const planZ = (y) => (y - 620) * PLAN_SCALE;

/**
 * @param {string} title
 * @param {[number, number, number, number]} bounds
 * @param {[number, number]} anchor
 * @param {number} height
 * @param {number} tone
 */
function room(title, bounds, anchor, height = 4.1, tone = 0) {
  const [x1, y1, x2, y2] = bounds;
  return {
    title, bounds, tone,
    outline: [[x1, y1], [x2, y1], [x2, y2], [x1, y2]],
    anchor: { plan: anchor, height },
  };
}

// The same polygons drive floor surfaces, highlights and public map markers.
export const campusPlanRooms = {
  saal: room('Saal', [60, 45, 905, 520], [490, 280], 6.1, -0.035),
  foyer: {
    ...room('Foyer', [175, 535, 1365, 1105], [365, 790], 4.1, 0.025),
    outline: [[175, 535], [1255, 535], [1255, 633], [610, 633], [610, 905], [530, 905], [530, 1000], [1365, 1000], [1365, 1105], [175, 1105]],
  },
  theke: room('Theke', [530, 910, 1040, 1000], [790, 950], 4.1, -0.045),
  gruppenraum: room('Gruppenraum', [1475, 347, 1835, 530], [1660, 435], 4.1, 0.025),
  werkstatt: room('Werkstatt', [1475, 540, 1835, 718], [1660, 630], 4.1, -0.025),
  maedchenzimmer: room('Mädchenzimmer', [1475, 730, 1835, 908], [1660, 820], 4.1, 0.035),
  tonstudio: room('Tonstudio', [1380, 45, 1740, 255], [1550, 150], 4.1, -0.025),
  bandraum: room('Bandraum', [1755, 45, 1950, 255], [1855, 150], 4.1, 0.025),
  // Where the toilets marker sits in the model (east of the Saal); only a spot
  // for the map, not the real room. Adjust bounds/anchor in floor-plan pixels.
  toiletten: room('Toiletten', [915, 230, 1255, 535], [1090, 385], 4.1, 0.03),
};

export const campusServiceZones = [
  { title: 'Nebenraum', bounds: [610, 633, 855, 905] },
  { title: 'Küche', bounds: [855, 633, 1035, 905] },
  { title: 'Büros', bounds: [1380, 1000, 1955, 1200] },
  { title: 'Flur', bounds: [1255, 140, 1360, 1000] },
];

// Essential room boundaries only. Small WC cubicles, cupboards, technical
// partitions and the bar furniture are deliberately not rendered as walls.
export const campusPartitions = [
  { name: 'Foyer-Westwand', segments: [[175, 910, 175, 1105]] },
  { name: 'Studio-Westwand', segments: [[1365, 135, 1365, 265]] },
  { name: 'Musikflur', segments: [[1365, 265, 1450, 265], [1510, 265, 1645, 265], [1700, 265, 1810, 265], [1875, 265, 1970, 265]] },
  { name: 'Tonstudio-Regie', height: 0.32, segments: [[1590, 30, 1590, 265]] },
  { name: 'Bandraum', segments: [[1745, 30, 1745, 265]] },
  { name: 'Gruppenraum', segments: [[1365, 340, 1840, 340], [1475, 340, 1475, 375], [1475, 435, 1475, 535]] },
  { name: 'Werkstatt', segments: [[1365, 535, 1420, 535], [1475, 535, 1840, 535], [1475, 535, 1475, 585], [1475, 645, 1475, 720]] },
  { name: 'Mädchenzimmer', segments: [[1365, 720, 1420, 720], [1475, 720, 1840, 720], [1475, 720, 1475, 780], [1475, 840, 1475, 910], [1365, 910, 1840, 910]] },
  { name: 'Büros', height: 0.35, segments: [[1365, 990, 1365, 1105], [1365, 990, 1515, 990], [1570, 990, 1670, 990], [1725, 990, 1825, 990], [1880, 990, 1970, 990], [1575, 990, 1575, 1210], [1775, 990, 1775, 1210]] },
  { name: 'Toiletten und Küche', height: 0.35, segments: [[610, 633, 680, 633], [750, 633, 1035, 633], [610, 633, 610, 905], [855, 633, 855, 905], [610, 905, 1035, 905]] },
  { name: 'Nebenräume', height: 0.35, segments: [[915, 230, 1255, 230], [1255, 135, 1255, 535]] },
  { name: 'Nebenräume-Südwand', segments: [[915, 535, 1255, 535]] },
];
