// Die MatriX 3D diorama — procedural building model (approximate reconstruction)
// Ported from the supplied interactive 3D demo; keep in sync with its behaviour.
import * as THREE from "three";
const S = 1 / 42,
  X = (x) => (x - 1005) * S,
  Z = (y) => (y - 620) * S;
const M = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
const mat = {
  wall: M("#e3dfd2"),
  partition: M("#f1eee1"),
  edge: M("#414b47"),
  floor: M("#c6c3b7"),
  wood: M("#bbae8c"),
  seat: M("#808f76"),
  sofa: M("#657f76"),
  metal: M("#4a5550"),
  glass: M("#698780", {
    metalness: 0.15,
    roughness: 0.2,
    transparent: true,
    opacity: 0.55,
  }),
  soil: M("#a4a58b"),
  green: M("#788c60"),
  white: M("#eeeadd"),
  paving: M("#c7c7b9"),
};
function texture(kind) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const a = c.getContext("2d");
  let seed = 27;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  if (kind === "wood") {
    a.fillStyle = "#8e8a7c";
    a.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 12) {
      a.fillStyle = `rgb(${118 + rand() * 25},${119 + rand() * 20},${108 + rand() * 20})`;
      a.fillRect(x, 0, 10, 256);
      a.fillStyle = "#565e56";
      a.fillRect(x + 10, 0, 2, 256);
      for (let i = 0; i < 25; i++) {
        a.fillStyle = "rgba(55,55,40,.09)";
        a.fillRect(x + rand() * 9, rand() * 256, 0.6, 35 + rand() * 60);
      }
    }
  } else {
    a.fillStyle = "#b6b2a1";
    a.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 13000; i++) {
      let v = Math.floor(135 + rand() * 70);
      a.fillStyle = `rgb(${v + 5},${v + 3},${v - 5})`;
      a.fillRect(rand() * 256, rand() * 256, 1 + rand() * 2, 1 + rand() * 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(kind === "wood" ? 1 : 6, kind === "wood" ? 1 : 6);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
mat.clad = M("#b2aea0", { map: texture("wood") });
mat.roof = M("#d7d2bb", { map: texture("gravel") });
for (const [role, material] of Object.entries(mat))
  material.userData.role = role;
function box(g, name, x, y, z, w, h, d, m) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.name = name;
  o.position.set(x, y + h / 2, z);
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}
function rect(g, name, x1, y1, x2, y2, h, m, base = 0) {
  return box(
    g,
    name,
    X((x1 + x2) / 2),
    base,
    Z((y1 + y2) / 2),
    (x2 - x1) * S,
    h,
    (y2 - y1) * S,
    m,
  );
}
function strip(g, name, x1, y1, x2, y2, h, m = mat.wall, base = 0, t = 0.18) {
  const a = new THREE.Vector2(X(x1), Z(y1)),
    b = new THREE.Vector2(X(x2), Z(y2));
  const o = box(
    g,
    name,
    (a.x + b.x) / 2,
    base,
    (a.y + b.y) / 2,
    a.distanceTo(b),
    h,
    t,
    m,
  );
  o.rotation.y = -Math.atan2(b.y - a.y, b.x - a.x);
  return o;
}
function slab(g, name, points, holes, h, base, m) {
  const shape = new THREE.Shape(
    points.map(([x, y]) => new THREE.Vector2(X(x), Z(y))),
  );
  for (const p of holes) {
    shape.holes.push(
      new THREE.Path(p.map(([x, y]) => new THREE.Vector2(X(x), Z(y)))),
    );
  }
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: false,
  });
  geom.rotateX(Math.PI / 2);
  const o = new THREE.Mesh(geom, m);
  o.position.y = base + h;
  o.name = name;
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}
export function createModel() {
  const model = new THREE.Group();
  model.name = "Die MatriX · approximate reconstruction";
  const floors = new THREE.Group(),
    outside = new THREE.Group(),
    inside = new THREE.Group(),
    roof = new THREE.Group(),
    furniture = new THREE.Group();
  model.add(floors, outside, inside, roof, furniture);
  floors.name = "Floor slabs";
  outside.name = "Exterior walls and glazing";
  inside.name = "Half-height walls";
  roof.name = "Roofs";
  furniture.name = "Schematic furniture";
  const outline = [
    [40, 30],
    [1040, 30],
    [1040, 135],
    [1365, 135],
    [1365, 30],
    [1970, 30],
    [1970, 340],
    [1840, 340],
    [1840, 910],
    [1970, 910],
    [1970, 1210],
    [1365, 1210],
    [1365, 1105],
    [175, 1105],
    [175, 1210],
    [40, 1210],
    [40, 910],
    [170, 910],
    [170, 535],
    [40, 535],
  ];
  const court = [
    [1040, 640],
    [1250, 640],
    [1250, 905],
    [1040, 905],
  ];
  slab(
    floors,
    "Footprint / courtyard opening",
    outline,
    [court],
    0.2,
    -0.2,
    mat.floor,
  );
  const zones = [
    ["Event hall", 90, 65, 912, 492, "#c7c1ac"],
    ["Foyer / lounge", 175, 535, 607, 910, "#d5d2bd"],
    ["Café / bar", 175, 910, 1365, 1105, "#d7c8ac"],
    ["Support rooms", 610, 633, 1035, 905, "#bdc6bd"],
    ["Circulation", 1255, 140, 1360, 1105, "#d8d9c8"],
    ["Group room 1", 1380, 45, 1580, 255, "#c5cbb7"],
    ["Group room 2", 1600, 45, 1735, 255, "#c5cbb7"],
    ["Group room 3", 1755, 45, 1950, 255, "#c5cbb7"],
    ["Activity room", 1475, 347, 1835, 530, "#cad2ba"],
    ["Workshop", 1475, 540, 1835, 718, "#ccbda5"],
    ["Quiet lounge", 1475, 730, 1835, 908, "#c6ccc2"],
    ["Meeting room 1", 1380, 1000, 1568, 1200, "#d2c5b5"],
    ["Meeting room 2", 1580, 1000, 1768, 1200, "#d2c5b5"],
    ["Meeting room 3", 1780, 1000, 1955, 1200, "#d2c5b5"],
  ];
  for (const [n, x, y, xx, yy, c] of zones)
    rect(floors, n, x, y, xx, yy, 0.025, M(c));
  rect(floors, "Courtyard gravel", 1040, 640, 1250, 905, 0.04, mat.soil, -0.05);
  // External walls and glazing traced along the floor-plan perimeter.
  const facades = [];
  function facade(x1, y1, x2, y2, windows = [], height = 3.65) {
    facades.push({ x1, y1, x2, y2, windows, height });
  }
  facade(
    40,
    30,
    915,
    30,
    [
      [200, 290],
      [310, 390],
      [410, 490],
      [510, 590],
      [610, 690],
      [710, 790],
      [835, 895],
    ],
    5.7,
  );
  facade(915, 30, 1040, 30, [[935, 1020]]);
  facade(1040, 30, 1040, 135, []);
  facade(1040, 135, 1365, 135, [
    [1050, 1130],
    [1240, 1345],
  ]);
  facade(1365, 135, 1365, 30, []);
  facade(1365, 30, 1970, 30, [
    [1425, 1510],
    [1630, 1690],
    [1810, 1895],
  ]);
  facade(1970, 30, 1970, 340, [[100, 210]]);
  facade(1970, 340, 1840, 340, []);
  facade(1840, 340, 1840, 910, [
    [370, 490],
    [565, 690],
    [770, 875],
  ]);
  facade(1840, 910, 1970, 910, []);
  facade(1970, 910, 1970, 1210, [[1010, 1150]]);
  facade(1970, 1210, 1365, 1210, [
    [1400, 1530],
    [1610, 1730],
    [1810, 1930],
  ]);
  facade(1365, 1210, 1365, 1105, []);
  facade(1365, 1105, 175, 1105, [
    [205, 480],
    [560, 1000],
    [1100, 1340],
  ]);
  facade(175, 1105, 175, 1210, []);
  facade(175, 1210, 40, 1210, []);
  facade(40, 1210, 40, 910, []);
  facade(40, 910, 170, 910, []);
  facade(170, 910, 170, 535, [
    [560, 650],
    [720, 875],
  ]);
  facade(170, 535, 40, 535, []);
  facade(40, 535, 40, 30, [[155, 420]], 5.7);
  // Tall hall's internal-facing south and east walls.
  facade(
    40,
    535,
    915,
    535,
    [
      [285, 385],
      [505, 605],
      [650, 890],
    ],
    5.7,
  );
  facade(
    915,
    535,
    915,
    30,
    [
      [140, 225],
      [260, 370],
    ],
    5.7,
  );
  // Open courtyard has full-height glazing on three sides.
  facade(1040, 640, 1250, 640, [[1050, 1240]]);
  facade(1250, 640, 1250, 905, [[655, 890]]);
  facade(1250, 905, 1040, 905, [[1050, 1240]]);
  facade(1040, 905, 1040, 640, [[655, 890]]);
  for (let i = 0; i < facades.length; i++) {
    const f = facades[i],
      horizontal = f.y1 === f.y2,
      start = Math.min(horizontal ? f.x1 : f.y1, horizontal ? f.x2 : f.y2),
      end = Math.max(horizontal ? f.x1 : f.y1, horizontal ? f.x2 : f.y2),
      fixed = horizontal ? f.y1 : f.x1;
    const seg = (g, a, b, h, m, base = 0, t = 0.22) =>
      horizontal
        ? strip(g, "Facade " + i, a, fixed, b, fixed, h, m, base, t)
        : strip(g, "Facade " + i, fixed, a, fixed, b, h, m, base, t);
    let cursor = start;
    for (const [a, b] of f.windows.sort((a, b) => a[0] - b[0])) {
      if (a > cursor) {
        seg(outside, cursor, a, f.height, mat.clad);
        seg(inside, cursor, a, 1.35, mat.wall);
      }
      const sill = i < 1 ? 1.15 : 0.15,
        wh = Math.min(2.7, f.height - 0.55) - sill;
      seg(outside, a, b, sill, mat.clad);
      seg(outside, a, b, f.height - (sill + wh), mat.clad, sill + wh);
      seg(outside, a, b, wh, mat.glass, sill, 0.07);
      seg(outside, a, b, 0.07, mat.edge, sill);
      seg(outside, a, b, 0.07, mat.edge, sill + wh);
      for (
        let p = a;
        p <= b;
        p += Math.max(24, (b - a) / Math.ceil((b - a) / 35))
      ) {
        seg(outside, p, p + 2, sill + wh, mat.edge, 0, 0.13);
      }
      seg(outside, b - 2, b, sill + wh, mat.edge, 0, 0.13);
      // Low glass plinth in the cutaway keeps the window positions readable.
      seg(inside, a, b, 0.18, mat.glass, 0, 0.09);
      cursor = b;
    }
    if (cursor < end) {
      seg(outside, cursor, end, f.height, mat.clad);
      seg(inside, cursor, end, 1.35, mat.wall);
    }
  }
  // Partitions are split around actual door openings rather than continuous boxes.
  const partitions = [
    [1365, 265, 1450, 265],
    [1510, 265, 1645, 265],
    [1700, 265, 1810, 265],
    [1875, 265, 1970, 265],
    [1590, 30, 1590, 265],
    [1745, 30, 1745, 265],
    [1365, 340, 1475, 340],
    [1530, 340, 1840, 340],
    [1365, 340, 1365, 390],
    [1365, 445, 1365, 535],
    [1365, 535, 1420, 535],
    [1475, 535, 1840, 535],
    [1475, 440, 1475, 720],
    [1475, 720, 1840, 720],
    [1365, 535, 1365, 585],
    [1365, 635, 1365, 815],
    [1365, 870, 1365, 910],
    [1365, 815, 1475, 815],
    [1475, 635, 1475, 815],
    [1365, 910, 1420, 910],
    [1475, 910, 1840, 910],
    [1365, 910, 1365, 950],
    [1365, 1000, 1365, 1105],
    [1365, 990, 1515, 990],
    [1570, 990, 1670, 990],
    [1725, 990, 1825, 990],
    [1880, 990, 1970, 990],
    [1575, 990, 1575, 1210],
    [1775, 990, 1775, 1210],
    [915, 125, 1040, 125],
    [915, 230, 1255, 230],
    [915, 385, 1255, 385],
    [1128, 230, 1128, 385],
    [1128, 325, 1255, 325],
    [1035, 385, 1035, 535],
    [915, 430, 1035, 430],
    [1255, 135, 1255, 265],
    [1255, 315, 1255, 385],
    [1255, 430, 1255, 535],
    [610, 633, 625, 633],
    [680, 633, 790, 633],
    [845, 633, 1035, 633],
    [610, 633, 610, 905],
    [735, 633, 735, 905],
    [855, 633, 855, 905],
    [1035, 633, 1035, 905],
    [610, 723, 665, 723],
    [710, 723, 735, 723],
    [735, 713, 780, 713],
    [825, 713, 855, 713],
    [855, 723, 925, 723],
    [975, 723, 1035, 723],
    [665, 723, 665, 905],
    [780, 713, 780, 905],
    [610, 760, 665, 760],
    [610, 795, 665, 795],
    [610, 830, 665, 830],
    [610, 865, 665, 865],
    [735, 775, 780, 775],
    [735, 835, 780, 835],
    [610, 905, 935, 905],
    [985, 905, 1035, 905],
    [530, 910, 530, 1000],
    [530, 1000, 1040, 1000],
    [1040, 1000, 1040, 910],
  ];
  for (const p of partitions) {
    strip(outside, "Interior partition", ...p, 3.3, mat.partition);
    strip(inside, "Cut partition", ...p, 1.35, mat.partition);
  }
  // Main flat roof, open lightwell and raised hall roof.
  const roofOutline = [
    [40, 30],
    [1040, 30],
    [1040, 135],
    [1365, 135],
    [1365, 30],
    [1970, 30],
    [1970, 1210],
    [40, 1210],
  ];
  const hall = [
    [40, 30],
    [915, 30],
    [915, 535],
    [40, 535],
  ];
  slab(
    roof,
    "Low gravel roof",
    [
      [915, 30],
      [1040, 30],
      [1040, 135],
      [1365, 135],
      [1365, 30],
      [1970, 30],
      [1970, 1210],
      [40, 1210],
      [40, 535],
      [915, 535],
    ],
    [court],
    0.22,
    3.65,
    mat.roof,
  );
  slab(roof, "Raised hall gravel roof", hall, [], 0.22, 5.7, mat.roof);
  function parapet(points, base) {
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length];
      strip(roof, "Roof coping", ...a, ...b, 0.19, mat.edge, base, 0.13);
    }
  }
  parapet(roofOutline, 3.87);
  parapet(court, 3.87);
  parapet(hall, 5.92);
  // Three characteristic skylights on the lower roof.
  for (const x of [1435, 1640, 1840]) {
    rect(
      roof,
      "Skylight frame",
      x - 25,
      740,
      x + 25,
      785,
      0.18,
      mat.edge,
      3.87,
    );
    rect(
      roof,
      "Skylight glazing",
      x - 22,
      743,
      x + 22,
      782,
      0.06,
      mat.glass,
      4.05,
    );
  }
  for (const [x, y] of [
    [700, 690],
    [745, 690],
    [810, 720],
    [860, 665],
    [940, 760],
    [880, 800],
  ]) {
    box(roof, "Vent", X(x), 3.87, Z(y), 0.17, 0.4, 0.17, mat.metal);
  }
  // Recessed entrance canopy columns.
  for (const x of [190, 480, 790, 1080, 1340])
    rect(
      outside,
      "Entrance canopy column",
      x - 3,
      1190,
      x + 3,
      1196,
      3.65,
      mat.metal,
    );
  // Furniture: positions follow the supplied plan; designs remain schematic.
  const fbox = (n, x, y, w, d, h, m = mat.wood, base = 0) =>
    rect(furniture, n, x - w / 2, y - d / 2, x + w / 2, y + d / 2, h, m, base);
  function table(x, y, w = 70, d = 40) {
    fbox("Table top", x, y, w, d, 0.07, mat.wood, 0.74);
    for (const dx of [-w / 2 + 4, w / 2 - 4])
      for (const dy of [-d / 2 + 4, d / 2 - 4])
        fbox("Table leg", x + dx, y + dy, 3, 3, 0.74, mat.metal);
  }
  function chair(x, y, rot = 0) {
    const group = new THREE.Group();
    furniture.add(group);
    box(group, "Chair seat", 0, 0.43, 0, 0.43, 0.08, 0.43, mat.seat);
    box(group, "Chair back", 0, 0.49, -0.2, 0.43, 0.45, 0.06, mat.seat);
    for (const a of [-0.17, 0.17])
      for (const b of [-0.17, 0.17])
        box(group, "Chair leg", a, 0, b, 0.035, 0.43, 0.035, mat.metal);
    group.position.set(X(x), 0, Z(y));
    group.rotation.y = rot;
    return group;
  }
  function sofa(x, y, w, d, rot = 0) {
    const group = new THREE.Group();
    furniture.add(group);
    const ww = w * S,
      dd = d * S;
    box(group, "Sofa seat", 0, 0.15, 0, ww, 0.35, dd, mat.sofa);
    box(group, "Sofa back", 0, 0.5, -dd / 2 + 0.1, ww, 0.35, 0.2, mat.sofa);
    box(group, "Sofa arm", -ww / 2 + 0.1, 0.5, 0, 0.2, 0.18, dd, mat.sofa);
    box(group, "Sofa arm", ww / 2 - 0.1, 0.5, 0, 0.2, 0.18, dd, mat.sofa);
    group.position.set(X(x), 0, Z(y));
    group.rotation.y = rot;
  }
  // Main hall: table banks / seats shown in plan.
  for (const x of [230, 350, 475, 595]) {
    for (const y of [190, 275, 360]) {
      table(x, y, 62, 70);
      for (const dy of [-23, 0, 23]) {
        chair(x - 44, y + dy, Math.PI / 2);
        chair(x + 44, y + dy, -Math.PI / 2);
      }
    }
  }
  // Lounge and bar.
  sofa(270, 740, 95, 40, Math.PI / 2);
  sofa(300, 850, 95, 40, Math.PI / 2);
  sofa(530, 700, 100, 40, -Math.PI / 2);
  table(365, 780, 45, 40);
  fbox("Bar counter", 790, 970, 490, 40, 1.02, mat.wood);
  fbox("Bar worktop", 790, 970, 500, 44, 0.08, mat.edge, 1.02);
  for (let x = 625; x <= 1000; x += 40) chair(x, 1025);
  // Service rooms and WC cubicles.
  for (const y of [743, 778, 813, 848, 883]) {
    fbox("WC", 640, y, 15, 20, 0.4, mat.white);
  }
  for (const y of [748, 810, 870]) fbox("WC", 755, y, 15, 20, 0.4, mat.white);
  for (const x of [880, 915, 950, 985])
    fbox("Kitchen counter", x, 875, 34, 35, 0.9, mat.white);
  for (const y of [260, 310, 360]) {
    table(1060, y, 90, 30);
  }
  // East activity / craft / lounge rooms.
  table(1600, 425, 80, 70);
  for (const y of [395, 430, 465]) {
    chair(1540, y, Math.PI / 2);
    chair(1660, y, -Math.PI / 2);
  }
  sofa(1775, 495, 95, 40);
  table(1690, 630, 130, 80);
  for (let x = 1640; x <= 1740; x += 33) {
    chair(x, 575);
    chair(x, 685, Math.PI);
  }
  for (const y of [600, 640]) {
    chair(1595, y, Math.PI / 2);
    chair(1785, y, -Math.PI / 2);
  }
  fbox("Workbench", 1500, 650, 35, 110, 0.9);
  sofa(1540, 770, 95, 40);
  table(1600, 820, 40, 40);
  sofa(1750, 770, 60, 35, 0.65);
  sofa(1750, 860, 65, 35, -0.5);
  for (const x of [1475, 1675, 1875]) {
    table(x, 1125, 65, 80);
    for (const y of [1100, 1145]) {
      chair(x - 45, y, Math.PI / 2);
      chair(x + 45, y, -Math.PI / 2);
    }
    table(x, 1050, 35, 35);
    chair(x - 35, 1025, 0.7);
    chair(x + 35, 1025, -0.7);
  }
  // Interior courtyard planting.
  for (let x = 1065; x < 1240; x += 38)
    for (let y = 665; y < 890; y += 40) {
      const o = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.2, 0),
        mat.green,
      );
      o.position.set(X(x), 0.17, Z(y));
      o.scale.y = 0.7;
      floors.add(o);
    }
  // MatriX entrance sign.
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 160;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#303f36";
  ctx.fillRect(0, 0, 512, 160);
  ctx.fillStyle = "#f2eee1";
  ctx.font = "bold 74px Arial";
  ctx.fillText("Die MatriX", 35, 101);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.75, 0.86),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  sign.position.set(X(110), 2.7, Z(1210) + 0.03);
  outside.add(sign);
  const roomLabels = [
    ["EVENT HALL", 490, 280],
    ["FOYER / LOUNGE", 370, 650],
    ["CAFÉ / BAR", 800, 1055],
    ["WC / SUPPORT", 795, 680],
    ["COURTYARD", 1145, 775],
    ["GROUP 1", 1480, 145],
    ["GROUP 2", 1670, 145],
    ["GROUP 3", 1850, 145],
    ["ACTIVITY", 1670, 375],
    ["WORKSHOP", 1690, 555],
    ["QUIET LOUNGE", 1660, 875],
    ["MEETING 1", 1475, 1190],
    ["MEETING 2", 1675, 1190],
    ["MEETING 3", 1870, 1190],
  ];
  inside.visible = false;
  const setMode = (cut, height = 1.35) => {
    outside.visible = !cut;
    roof.visible = !cut;
    inside.visible = cut;
    inside.scale.y = height / 1.35;
  };
  model.userData = {
    description:
      "Approximate visual reconstruction from supplied floor plan and photographs. Dimensions, heights, room uses and furniture are indicative.",
    unit: "metre",
    estimatedWidth: 46,
    estimatedDepth: 28.1,
  };
  return {
    model,
    floors,
    outside,
    inside,
    roof,
    furniture,
    setMode,
    roomLabels: roomLabels.map(([name, x, y]) => ({
      name,
      position: new THREE.Vector3(X(x), 0.1, Z(y)),
    })),
  };
}
export function createLandscape() {
  const g = new THREE.Group();
  g.name = "Schematic context";
  rect(
    g,
    "Landscape plinth",
    -180,
    -180,
    2190,
    1410,
    0.32,
    M("#c3cbb3"),
    -0.58,
  );
  rect(g, "Front footpath", -180, 1290, 2190, 1390, 0.04, mat.paving, -0.2);
  rect(g, "Side footpath", -65, -140, 0, 1290, 0.04, mat.paving, -0.2);
  rect(g, "Side footpath", 2010, -140, 2080, 1290, 0.04, mat.paving, -0.2);
  rect(g, "Entrance terrace", 175, 1105, 1365, 1290, 0.04, mat.paving, -0.18);
  rect(g, "Side terrace", 1840, 340, 2010, 910, 0.04, mat.paving, -0.18);
  rect(g, "Rear entry", 1040, -20, 1365, 135, 0.04, mat.paving, -0.18);
  function tree(x, y, h = 3.4) {
    const trunk = box(
      g,
      "Schematic tree trunk",
      X(x),
      -0.2,
      Z(y),
      0.13,
      h * 0.7,
      0.13,
      mat.wood,
    );
    for (const [dx, dz, sc] of [
      [-0.5, 0, 1],
      [0.5, 0.15, 0.9],
      [0, -0.25, 1.1],
    ]) {
      const t = new THREE.Mesh(
        new THREE.IcosahedronGeometry(h * 0.34, 1),
        M("#9bac85"),
      );
      t.position.set(X(x) + dx, h * 0.72, Z(y) + dz);
      t.scale.y = 1.15 * sc;
      t.castShadow = true;
      g.add(t);
    }
  }
  for (const [x, y, h] of [
    [-95, 80, 3.9],
    [-95, 740, 3.6],
    [2130, 250, 3.8],
    [2120, 1000, 3.5],
    [390, 1240, 3],
    [1120, 1250, 2.8],
    [-90, 1190, 3],
  ])
    tree(x, y, h);
  for (let x = 410; x < 1250; x += 155)
    rect(g, "Concrete seat", x, 1170, x + 20, 1190, 0.45, mat.floor, -0.15);
  return g;
}
