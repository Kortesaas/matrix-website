// Die MatriX 3D diorama — procedural building model (approximate reconstruction)
// Room layout follows the labeled floor plan; the cutaway keeps only essential walls.
import * as THREE from "three";
import { campusPlanRooms, campusServiceZones, campusPartitions, PLAN_SCALE as S, planX as X, planZ as Z } from '../../data/campus-plan.js';
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
  inside.name = "Simplified room boundaries";
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
  for (const [id, room] of Object.entries(campusPlanRooms)) {
    const material = M('#d5d2bd');
    material.userData.role = 'floor';
    material.userData.lightnessOffset = room.tone;
    const floor = slab(floors, room.title, room.outline, [], 0.025, 0, material);
    floor.userData.roomId = id;
  }
  for (const zone of campusServiceZones) {
    rect(floors, zone.title, ...zone.bounds, 0.025, mat.floor);
  }
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
      cursor = b;
    }
    if (cursor < end) {
      seg(outside, cursor, end, f.height, mat.clad);
    }
  }
  // A single low perimeter per facade replaces the many window fragments
  // in the cutaway, while the closed building retains its detailed glazing.
  for (const f of facades) {
    strip(inside, 'Low perimeter', f.x1, f.y1, f.x2, f.y2, 0.48, mat.wall, 0, 0.22);
  }
  for (const partition of campusPartitions) {
    for (const segment of partition.segments) {
      strip(outside, partition.name, ...segment, 3.3, mat.partition);
      strip(inside, partition.name, ...segment, partition.height ?? 0.7, mat.partition);
    }
  }
  // The roof bridges the recessed rear entrance with one straight outer edge.
  // The walls below retain their recess; the courtyard stays open.
  const roofOutline = [
    [40, 30],
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
    box(group, "Chair base", 0, 0, 0, 0.26, 0.43, 0.26, mat.metal);
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
  // Stage footprint from the blue annotation. Its front edge and step face
  // +planY, which projects towards the bottom left in the default view.
  fbox('Hall stage', 745, 275, 240, 350, 0.45, mat.wood);
  fbox('Hall stage front step', 745, 465, 220, 30, 0.22, mat.wood);
  for (const x of [300, 410, 520]) {
    for (const y of [155, 265, 375]) chair(x, y, Math.PI / 2);
  }

  // Foyer seating and the actual U-shaped counter. Counter wings are low
  // furniture, not the three full-height walls used in the original model.
  sofa(270, 740, 95, 40, Math.PI / 2);
  sofa(300, 850, 95, 40, Math.PI / 2);
  table(365, 780, 45, 40);
  fbox('Theke front', 790, 982, 500, 32, 1.02, mat.wood);
  fbox('Theke left wing', 540, 952, 22, 90, 1.02, mat.wood);
  fbox('Theke right wing', 1028, 952, 22, 90, 1.02, mat.wood);
  for (const x of [630, 730, 830, 930]) chair(x, 1040, Math.PI);

  // Gruppenraum, Werkstatt, Mädchenzimmer — north to south, as labeled.
  table(1640, 430, 90, 60);
  for (const y of [405, 455]) {
    chair(1575, y, Math.PI / 2);
    chair(1705, y, -Math.PI / 2);
  }
  sofa(1775, 495, 95, 40);
  table(1670, 630, 115, 65);
  for (const x of [1640, 1700]) {
    chair(x, 575);
    chair(x, 685, Math.PI);
  }
  fbox('Workbench', 1500, 630, 35, 120, 0.9);
  sofa(1540, 770, 95, 40);
  table(1630, 820, 55, 45);
  sofa(1750, 780, 75, 35, 0.3);
  sofa(1750, 865, 75, 35, -0.3);

  // Studio control desk and recording position, separate from the band room.
  fbox('Studio mixing desk', 1490, 115, 125, 55, 0.8, mat.wood);
  fbox('Studio display', 1490, 95, 55, 9, 0.4, mat.metal, 0.8);
  chair(1490, 165);
  sofa(1435, 215, 85, 35);
  fbox('Studio microphone stand', 1660, 150, 4, 4, 1.2, mat.metal);
  fbox('Studio microphone', 1660, 150, 18, 6, 0.08, mat.metal, 1.2);

  // A handful of bold shapes reads as a drum kit even at phone size.
  function drum(name, x, y, radius, height, base = 0) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16), mat.wood);
    mesh.name = name;
    mesh.position.set(X(x), base + height / 2, Z(y));
    mesh.castShadow = mesh.receiveShadow = true;
    furniture.add(mesh);
    return mesh;
  }
  drum('Bass drum', 1845, 145, 0.52, 0.55).rotation.x = Math.PI / 2;
  drum('Snare drum', 1805, 175, 0.3, 0.22, 0.55);
  drum('Tom drum', 1845, 110, 0.28, 0.3, 0.6);
  fbox('Cymbal stand', 1895, 155, 4, 4, 1.1, mat.metal);
  drum('Cymbal', 1895, 155, 0.43, 0.035, 1.1);
  fbox('Band amplifier', 1910, 75, 42, 25, 0.9, mat.metal);
  fbox('Band amplifier', 1790, 75, 42, 25, 0.9, mat.metal);

  // Offices remain as context rather than another dense set of meeting rooms.
  for (const x of [1475, 1675, 1875]) {
    table(x, 1125, 75, 55);
    chair(x, 1080, Math.PI);
  }
  // Interior courtyard planting.
  for (let x = 1075; x < 1240; x += 55)
    for (let y = 675; y < 890; y += 65) {
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
  const roomLabels = Object.values(campusPlanRooms).map((room) => [room.title, ...room.anchor.plan]);
  inside.visible = false;
  const setMode = (cut, height = 0.7) => {
    outside.visible = !cut;
    roof.visible = !cut;
    inside.visible = cut;
    inside.scale.y = height / 0.7;
  };
  model.userData = {
    description:
      "Room layout checked against the supplied labeled floor plan. Building heights, exterior details and furniture remain illustrative.",
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
