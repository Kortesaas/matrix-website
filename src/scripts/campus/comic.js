// Die MatriX 3D diorama — toon materials, illustrated landscape, outline shader
// Ported from the supplied interactive 3D demo; keep in sync with its behaviour.
import * as THREE from "three";
let ink = "#241b36";
/** Outline/ink colour for everything created afterwards (the site passes its --ink). */
export function setInk(color) {
  ink = color;
}
export function createPalette(h = 266) {
  return {
    h,
    ink,
    color: (s, l) =>
      new THREE.Color().setHSL(h / 360, s, l, THREE.SRGBColorSpace),
    css: (s, l) => `hsl(${h} ${s * 100}% ${l * 100}%)`,
  };
}
const roles = {
  clad: [0.46, 0.67],
  roof: [0.43, 0.83],
  wall: [0.38, 0.8],
  partition: [0.32, 0.88],
  floor: [0.32, 0.86],
  wood: [0.44, 0.65],
  seat: [0.48, 0.59],
  sofa: [0.5, 0.55],
  metal: [0.3, 0.26],
  edge: [0.34, 0.26],
  glass: [0.45, 0.41],
  soil: [0.35, 0.77],
  green: [0.52, 0.61],
  white: [0.3, 0.91],
  paving: [0.25, 0.92],
};
export function toonify(root) {
  const ramp = new THREE.DataTexture(
    new Uint8Array([
      65, 65, 65, 255, 130, 130, 130, 255, 205, 205, 205, 255, 255, 255, 255,
      255,
    ]),
    4,
    1,
    THREE.RGBAFormat,
  );
  ramp.needsUpdate = true;
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false;
  const converted = new Map(),
    materials = [];
  const cladding = document.createElement("canvas");
  cladding.width = 256;
  cladding.height = 256;
  let c = cladding.getContext("2d");
  c.fillStyle = "#fff";
  c.fillRect(0, 0, 256, 256);
  c.strokeStyle = "#a49bb7";
  c.lineWidth = 1.2;
  for (let i = 0; i < 256; i += 14) {
    c.beginPath();
    c.moveTo(i + 0.5, 0);
    c.lineTo(i + 0.5, 256);
    c.stroke();
  }
  const cladMap = new THREE.CanvasTexture(cladding);
  cladMap.colorSpace = THREE.SRGBColorSpace;
  cladMap.wrapS = cladMap.wrapT = THREE.RepeatWrapping;
  const gravel = document.createElement("canvas");
  gravel.width = 512;
  gravel.height = 512;
  c = gravel.getContext("2d");
  c.fillStyle = "#fff";
  c.fillRect(0, 0, 512, 512);
  let seed = 23;
  const r = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 5000; i++) {
    c.fillStyle = i % 3 ? "#c7c0d5" : "#a59ab8";
    c.beginPath();
    c.arc(r() * 512, r() * 512, r() * 0.65 + 0.25, 0, Math.PI * 2);
    c.fill();
  }
  const roofMap = new THREE.CanvasTexture(gravel);
  roofMap.colorSpace = THREE.SRGBColorSpace;
  roofMap.wrapS = roofMap.wrapT = THREE.RepeatWrapping;
  roofMap.repeat.set(0.035, 0.035);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const orig = o.material;
    let part = o;
    while (part.parent && part.parent !== root) part = part.parent;
    const key = orig.uuid + ":" + part.id;
    if (!converted.has(key)) {
      let role = orig.userData?.role || "floor";
      const args = { color: orig.color, gradientMap: ramp, side: orig.side };
      if (role === "clad") args.map = cladMap;
      if (role === "roof") args.map = roofMap;
      if (role === "glass") {
        args.transparent = true;
        args.opacity = 0.76;
        args.depthWrite = false;
      }
      if (o.name === "") {
        role = "green";
      }
      if (orig.isMeshBasicMaterial && orig.map) {
        args.map = orig.map;
        role = "white";
      }
      const m = new THREE.MeshToonMaterial(args);
      m.userData.role = role;
      m.userData.lightnessOffset = orig.userData.lightnessOffset ?? 0;
      converted.set(key, m);
      materials.push(m);
    }
    o.material = converted.get(key);
  });
  return (palette) => {
    for (const m of materials) {
      const [s, l] = roles[m.userData.role] || roles.floor;
      m.color.copy(palette.color(s, THREE.MathUtils.clamp(l + m.userData.lightnessOffset, 0, 1)));
    }
  };
}
function rng(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
function treeTexture(p, seed = 10, type = "tree") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext("2d"),
    r = rng(seed);
  ctx.lineCap = ctx.lineJoin = "round";
  const bush = type === "bush";
  // Overlapping circles form a single scalloped, hand-illustrated crown.
  const centerX = 256,
    centerY = bush ? 510 : 270,
    rx = bush ? 208 : 184,
    ry = bush ? 114 : 190;
  const cloud = new Path2D(
    "M256 80 C240 50 200 61 194 90 C167 75 130 95 132 126 C95 112 70 142 78 166 C39 170 32 207 51 225 C25 251 42 290 65 293 C43 321 67 356 94 354 C80 395 116 421 146 410 C157 444 201 451 223 430 C253 459 293 440 298 420 C331 438 369 417 366 390 C405 396 431 362 417 338 C457 326 465 285 438 266 C464 235 442 197 414 198 C430 166 404 140 378 145 C384 106 352 91 327 106 C320 77 280 65 256 80 Z",
  );
  const sx = bush ? 1.05 : 0.91 + r() * 0.12,
    sy = bush ? 0.75 : 0.96 + r() * 0.12;
  const transform = (c) => {
    c.translate(256, centerY);
    c.scale(sx, sy);
    c.translate(-256, -260);
  };
  const mask = document.createElement("canvas");
  mask.width = 512;
  mask.height = 768;
  const m = mask.getContext("2d");
  m.fillStyle = "white";
  m.save();
  transform(m);
  m.fill(cloud);
  m.restore();
  // Dark ink silhouette, then the flat color fill.
  ctx.shadowColor = p.ink;
  ctx.shadowBlur = 0;
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = p.css(0.48, 0.72);
  ctx.fillRect(0, 0, 512, 768);
  ctx.globalCompositeOperation = "source-over";
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = p.css(0.5, 0.6);
  ctx.beginPath();
  ctx.moveTo(15, centerY + 80);
  ctx.bezierCurveTo(110, centerY + 150, 100, centerY - 45, 188, centerY + 60);
  ctx.bezierCurveTo(255, centerY + 140, 305, centerY - 30, 360, centerY + 5);
  ctx.bezierCurveTo(450, centerY + 100, 420, centerY - 40, 520, centerY - 70);
  ctx.lineTo(520, 750);
  ctx.lineTo(0, 750);
  ctx.fill();
  ctx.fillStyle = p.css(0.42, 0.8);
  ctx.beginPath();
  ctx.moveTo(105, centerY - 95);
  ctx.bezierCurveTo(95, centerY - 130, 135, centerY - 155, 156, centerY - 134);
  ctx.bezierCurveTo(185, centerY - 163, 223, centerY - 139, 211, centerY - 116);
  ctx.bezierCurveTo(252, centerY - 112, 245, centerY - 77, 217, centerY - 75);
  ctx.bezierCurveTo(200, centerY - 42, 166, centerY - 55, 165, centerY - 66);
  ctx.bezierCurveTo(125, centerY - 45, 102, centerY - 65, 105, centerY - 95);
  ctx.fill();
  ctx.restore();
  // Outline the union without outlining every lobe.
  ctx.save();
  transform(ctx);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 5;
  ctx.stroke(cloud);
  ctx.restore();
  // Tufts inside the crown, with deliberately irregular little curls.
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  for (let i = 0; i < (bush ? 5 : 10); i++) {
    const x = centerX + (r() - 0.5) * rx * 1.3,
      y = centerY + (r() - 0.5) * ry * 1.25;
    ctx.beginPath();
    ctx.moveTo(x, y + 5);
    ctx.bezierCurveTo(x - 10, y, x - 5, y - 10, x + 2, y - 5);
    ctx.bezierCurveTo(x + 3, y - 15, x + 15, y - 9, x + 12, y);
    ctx.stroke();
  }
  if (!bush) {
    const bottom = 720;
    ctx.fillStyle = p.css(0.34, 0.35);
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(239, bottom);
    ctx.lineTo(246, 440);
    ctx.lineTo(199, 382);
    ctx.lineTo(208, 377);
    ctx.lineTo(257, 422);
    ctx.lineTo(288, 358);
    ctx.lineTo(298, 360);
    ctx.lineTo(271, 444);
    ctx.lineTo(274, bottom);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(256, 468);
    ctx.lineTo(312, 415);
    ctx.lineTo(325, 391);
    ctx.moveTo(245, 421);
    ctx.lineTo(236, 348);
    ctx.moveTo(262, 404);
    ctx.lineTo(260, 327);
    ctx.moveTo(215, 400);
    ctx.lineTo(193, 407);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(250, 700);
    ctx.lineTo(255, 565);
    ctx.stroke();
  }
  let output = canvas;
  if (bush) {
    output = document.createElement("canvas");
    output.width = 512;
    output.height = 345;
    output.getContext("2d").drawImage(canvas, 0, 345, 512, 345, 0, 0, 512, 345);
  }
  const texture = new THREE.CanvasTexture(output);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
export function createComicLandscape(initialPalette) {
  const g = new THREE.Group();
  g.name = "Illustrated landscape";
  const paletteMaterials = [],
    trees = [];
  const palMat = (role, s, l, extra = {}) => {
    const C =
      role === "land" || role === "paving"
        ? THREE.MeshBasicMaterial
        : THREE.MeshToonMaterial;
    const m = new C({ color: initialPalette.color(s, l), ...extra });
    if (role === "land" || role === "paving") m.toneMapped = false;
    paletteMaterials.push({ m, s, l });
    m.userData.role = role;
    return m;
  };
  const ground = palMat("land", 0.4, 0.84),
    path = palMat("paving", 0.28, 0.92),
    dark = palMat("metal", 0.38, 0.34),
    light = palMat("white", 0.25, 0.88),
    wood = palMat("wood", 0.44, 0.62);
  const mesh = (name, geo, mat, x, y, z) => {
    const o = new THREE.Mesh(geo, mat);
    o.name = name;
    o.position.set(x, y, z);
    o.receiveShadow = true;
    o.castShadow = true;
    g.add(o);
    return o;
  };
  const box = (name, x, y, z, w, h, d, m) =>
    mesh(name, new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z);
  const line = (points, color = ink, width = 1) => {
    const geo = new THREE.BufferGeometry().setFromPoints(
      points.map((v) => new THREE.Vector3(...v)),
    );
    const o = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.65 }),
    );
    g.add(o);
    return o;
  };
  // A compact illustrated island, with a slightly irregular perimeter.
  const pts = [
    [-32, -23],
    [-24, -24],
    [-10, -24],
    [3, -23],
    [18, -24],
    [31, -22],
    [33, -12],
    [32, 2],
    [33, 16],
    [29, 24],
    [16, 25],
    [2, 24],
    [-11, 25],
    [-29, 24],
    [-34, 16],
    [-46, 12],
    [-50, 3],
    [-49, -13],
    [-43, -21],
  ];
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.27,
    bevelEnabled: false,
  });
  geo.rotateX(Math.PI / 2);
  mesh("Illustrated island", geo, ground, 0, -0.24, 0);
  box("Front footpath", 0, -0.22, 20, 64, 0.045, 2.5, path);
  box("Right footpath", 26, -0.21, -1, 1.8, 0.05, 40, path);
  box("Entrance terrace", -6, -0.19, 14.7, 28.4, 0.04, 5.6, path);
  box("Side terrace", 21.5, -0.19, 0.1, 3.1, 0.04, 13.7, path);
  for (let x = -30; x < 32; x += 3.2)
    line(
      [
        [x, -0.166, 18.75],
        [x, -0.166, 21.25],
      ],
      initialPalette.color(0.33, 0.67),
    );
  for (let z = -20; z < 19; z += 3.1) {
    line(
      [
        [25.1, -0.154, z],
        [26.9, -0.154, z],
      ],
      initialPalette.color(0.33, 0.67),
    );
  }
  // Illustrated trees are shallow vertical cards: their linework stays readable during the limited tilt.
  function tree(x, z, h, seed, type = "tree") {
    if (type === "tree") h *= 1.25;
    const tex = treeTexture(initialPalette, seed, type);
    const m = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.25,
      side: THREE.DoubleSide,
      depthWrite: true,
      toneMapped: false,
    });
    const tall = type === "tree",
      w = h * (tall ? 0.88 : 1.65);
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, h * 0.5 - (tall ? (h * 48) / 768 : (h * 21) / 345), 0);
    const o = mesh(
      tall ? "Illustrated tree" : "Illustrated shrub",
      geo,
      m,
      x,
      -0.18,
      z,
    );
    o.rotation.y = 0.72;
    o.castShadow = false;
    o.userData.illustration = true;
    trees.push({ o, seed, type });
    if (tall) {
      const shadow = mesh(
        "Tree shadow",
        new THREE.CircleGeometry(1, 32),
        new THREE.MeshBasicMaterial({
          color: initialPalette.color(0.5, 0.44),
          transparent: true,
          opacity: 0.19,
          depthWrite: false,
        }),
        x + 0.6,
        -0.145,
        z + 0.2,
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.scale.set(h * 0.32, h * 0.17, 1);
      shadow.userData.noInk = true;
      shadow.castShadow = false;
      paletteMaterials.push({ m: shadow.material, s: 0.5, l: 0.44 });
    }
  }
  const specs = [
    [-29, -18, 7, 13],
    [-19, -22, 7.8, 17],
    [-5, -22, 6.8, 29],
    [10, -22, 7.5, 35],
    [25, -20, 8, 41],
    [-47, -14, 7.5, 43],
    [-47, 9, 6.5, 59],
    [30, -9, 7.2, 67],
    [30, 5, 7.5, 73],
    [30, 17, 8, 79],
    [-26, 22, 7.7, 83],
    [-15, 23, 6.7, 97],
    [0, 24, 7.8, 101],
    [17, 24, 7.1, 107],
  ];
  for (const p of specs) tree(...p);
  for (const [x, z, h, seed] of [
    [-47, -10, 2.4, 11],
    [-47, 2, 2.2, 27],
    [-25, 23, 1.6, 45],
    [-18, 22, 1.8, 61],
    [8, 23, 2.3, 67],
    [26, 21, 2.4, 71],
    [29, -16, 2, 77],
    [-15, -22, 2, 85],
    [19, -22, 2.2, 89],
    [28, 12, 2.7, 93],
    [28, 1, 2, 97],
    [-31, 16, 2.6, 101],
    [-20, 15.5, 1.8, 109],
    [-3, 15.5, 1.8, 113],
    [12, 15.5, 2.1, 127],
  ])
    tree(x, z, h, seed, "bush");
  // Grass tufts and little stones give the ground its storybook texture.
  const r = rng(58);
  for (let i = 0; i < 110; i++) {
    const x = -31 + r() * 62,
      z = -23 + r() * 47;
    if (Math.abs(x) < 24 && z > -19 && z < 18) continue;
    if (Math.abs(z - 20) < 1.5 || Math.abs(x - 26) < 1) continue;
    const h = 0.15 + r() * 0.17;
    line(
      [
        [x - 0.22, -0.14, z],
        [x - 0.13, h, z],
        [x, -0.14, z],
        [x + 0.1, h * 0.7, z],
        [x + 0.2, -0.14, z],
      ],
      ink,
    );
  }
  for (const [x, z] of [
    [-29, 16],
    [28, -17],
    [10, -22],
    [-12, 23],
  ]) {
    const rock = mesh(
      "Cartoon stone",
      new THREE.DodecahedronGeometry(0.45, 0),
      light,
      x,
      0.12,
      z,
    );
    rock.scale.set(1.3, 0.65, 0.85);
  }
  // Circular basketball area beside the building, traced in broad terms from the side reference.
  const courtX = -39.5,
    courtZ = 3,
    radius = 5.5;
  const court = mesh(
    "Circular basketball court",
    new THREE.CircleGeometry(radius, 96),
    palMat("court", 0.32, 0.71),
    courtX,
    -0.17,
    courtZ,
  );
  court.rotation.x = -Math.PI / 2;
  function arc(cx, cz, r, a = 0, b = Math.PI * 2) {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const t = a + ((b - a) * i) / 80;
      pts.push([cx + Math.cos(t) * r, -0.151, cz + Math.sin(t) * r]);
    }
    line(pts, ink);
  }
  arc(courtX, courtZ, radius - 0.17);
  arc(courtX, courtZ, 1.05);
  line(
    [
      [courtX, -0.15, courtZ - radius + 0.2],
      [courtX, -0.15, courtZ + radius - 0.2],
    ],
    ink,
  );
  for (const side of [-1, 1]) {
    const x = courtX + side * 4.6;
    box(
      "Basketball post",
      x + side * 0.8,
      -0.15,
      courtZ,
      0.15,
      3.4,
      0.15,
      light,
    );
    box(
      "Basketball support",
      x + side * 0.35,
      3.0,
      courtZ,
      0.9,
      0.12,
      0.12,
      dark,
    );
    box("Backboard", x, 2.6, courtZ, 0.12, 1.05, 1.55, light);
    box(
      "Backboard square",
      x - side * 0.071,
      2.86,
      courtZ,
      0.025,
      0.4,
      0.6,
      dark,
    );
    box(
      "Backboard square inset",
      x - side * 0.089,
      2.9,
      courtZ,
      0.02,
      0.29,
      0.47,
      light,
    );
    const rimX = x - side * 0.36;
    const rim = mesh(
      "Basketball rim",
      new THREE.TorusGeometry(0.29, 0.035, 6, 24),
      dark,
      rimX,
      2.8,
      courtZ,
    );
    rim.rotation.x = Math.PI / 2;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2,
        b = a + 0.35;
      line(
        [
          [rimX + Math.cos(a) * 0.28, 2.78, courtZ + Math.sin(a) * 0.28],
          [rimX + Math.cos(b) * 0.17, 2.4, courtZ + Math.sin(b) * 0.17],
        ],
        ink,
      );
    }
    arc(
      courtX + side * 3,
      courtZ,
      1.5,
      side > 0 ? Math.PI / 2 : -Math.PI / 2,
      side > 0 ? Math.PI * 1.5 : Math.PI / 2,
    );
  }
  // A short path joins the round court to the building-side path.

  // Small, deliberately chunky park furniture.
  for (const x of [-18, -15, -12, -9, -6, -3]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0, 17.5),
      new THREE.Vector3(x, 0.8, 17.5),
      new THREE.Vector3(x + 0.55, 0.85, 17.5),
      new THREE.Vector3(x + 0.55, 0, 17.5),
    ]);
    mesh(
      "Bike rack",
      new THREE.TubeGeometry(curve, 12, 0.055, 5, false),
      light,
      0,
      0,
      0,
    );
  }
  for (const [x, z] of [
    [-23, 16],
    [23, 12],
  ]) {
    box("Lamp post", x, -0.15, z, 0.12, 4.4, 0.12, light);
    box("Lamp cap", x, 4.25, z, 0.65, 0.2, 0.4, dark);
    box("Lamp glass", x, 4.04, z, 0.46, 0.22, 0.28, light);
  }
  for (const [x, z] of [
    [-8, 16],
    [12, 17],
  ]) {
    box("Bench seat", x, 0.35, z, 2, 0.13, 0.65, wood);
    box("Bench back", x, 0.48, z - 0.28, 2, 0.55, 0.1, wood);
    for (const dx of [-0.7, 0.7])
      box("Bench leg", x + dx, -0.15, z, 0.12, 0.5, 0.42, dark);
  }
  box("Utility cabinet", 28, -0.16, -0.5, 1.3, 1.5, 0.8, light);
  box("Cabinet panel", 28, 0.35, -0.08, 0.8, 0.65, 0.03, dark);
  box("Litter bin", -19, -0.16, 17.2, 0.6, 0.9, 0.6, light);
  function updatePalette(p) {
    for (const { m, s, l } of paletteMaterials) m.color.copy(p.color(s, l));
    for (const t of trees) {
      const old = t.o.material.map;
      t.o.material.map = treeTexture(p, t.seed, t.type);
      old.dispose();
    }
  }
  return {
    group: g,
    updatePalette,
    updateCamera(camera) {
      for (const t of trees) t.o.quaternion.copy(camera.quaternion);
    },
  };
}
// Keep phone contours fine without losing detail on high-density screens.
export function comicRenderSettings(mobile, deviceScale = 1) {
  return {
    pixelRatio: mobile ? Math.min(3, Math.max(2, deviceScale)) : Math.min(deviceScale, 2),
    outlineWidth: mobile ? 0.55 : 1.1,
    outlineOpacity: mobile ? 0.8 : 0.92,
  };
}

// Depth + normal discontinuities supply screen-space comic contours, including creases and silhouettes.
export function createComicRenderer(renderer, scene, camera) {
  const colorTarget = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
  colorTarget.texture.colorSpace = THREE.SRGBColorSpace;
  // Interpolating normals between adjacent surfaces creates fuzzy dark halos.
  const normalTarget = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });
  normalTarget.depthTexture = new THREE.DepthTexture(
    1,
    1,
    THREE.UnsignedIntType,
  );
  const normalCache = new Map(),
    drawables = [];
  // Every mesh gets a normal-pass twin for the contours; meshes added later
  // (a model loaded on demand) register through track().
  const track = (root) => root.traverse((o) => {
    if (!o.isMesh || drawables.some((d) => d.o === o)) return;
    const original = o.material;
    // A mesh with one material per face (the Roadrunner's painted sides)
    // takes its settings from the first one.
    const base = Array.isArray(original) ? original[0] : original;
    let normal = normalCache.get(original);
    if (!normal) {
      normal = new THREE.ShaderMaterial({
        uniforms: {
          tMap: { value: base.map || null },
          hasMap: { value: !!base.map },
          alpha: { value: base.opacity ?? 1 },
        },
        side: base.side,
        vertexShader: `varying vec3 n; varying vec2 uv0; void main(){uv0=uv;n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform sampler2D tMap;uniform bool hasMap;uniform float alpha;varying vec3 n;varying vec2 uv0;void main(){float a=alpha;if(hasMap)a*=texture2D(tMap,uv0).a;if(a<.22)discard;gl_FragColor=vec4(normalize(n)*.5+.5,1.);}`,
      });
      normalCache.set(original, normal);
    }
    drawables.push({ o, original, base, normal });
  });
  track(scene);
  const shader = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tColor: { value: colorTarget.texture },
      tNormal: { value: normalTarget.texture },
      tDepth: { value: normalTarget.depthTexture },
      resolution: { value: new THREE.Vector2(1, 1) },
      ink: { value: new THREE.Color(ink) },
      weight: { value: 1.05 },
      strength: { value: 0.92 },
      enabled: { value: true },
    },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader: `varying vec2 vUv;uniform sampler2D tColor,tNormal,tDepth;uniform vec2 resolution;uniform vec3 ink;uniform float weight,strength;uniform bool enabled;float depth(vec2 uv){return texture2D(tDepth,uv).x;}void main(){vec4 src=texture2D(tColor,vUv);vec3 color=src.rgb;float d=depth(vUv);vec3 n=texture2D(tNormal,vUv).xyz;float de=0.,ne=0.;for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){vec2 off=vec2(float(x),float(y))*weight/resolution;float dd=depth(vUv+off);vec3 nn=texture2D(tNormal,vUv+off).xyz;if(d<.999&&dd<.999)ne=max(ne,length(n-nn));}}vec2 px=weight/resolution;de=abs(depth(vUv+vec2(px.x,0.))+depth(vUv-vec2(px.x,0.))-2.*d)+abs(depth(vUv+vec2(0.,px.y))+depth(vUv-vec2(0.,px.y))-2.*d);float edge=max(smoothstep(.00025,.0008,de),smoothstep(.32,.6,ne));if(!enabled)edge=0.;float e=edge*strength;gl_FragColor=vec4(mix(color,ink,e),mix(src.a,1.,e));
#include <colorspace_fragment>
}`,
  });
  const quadScene = new THREE.Scene();
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shader));
  const quadCamera = new THREE.Camera();
  const clear = new THREE.Color();
  return {
    resize(w, h, mobile = false) {
      const dpr = renderer.getPixelRatio();
      const settings = comicRenderSettings(mobile, dpr);
      const width = Math.max(1, Math.floor(w * dpr));
      const height = Math.max(1, Math.floor(h * dpr));
      colorTarget.setSize(width, height);
      normalTarget.setSize(width, height);
      shader.uniforms.resolution.value.set(width, height);
      shader.uniforms.weight.value = Math.max(0.75, settings.outlineWidth * dpr);
      shader.uniforms.strength.value = settings.outlineOpacity;
    },
    setInk(enabled) {
      shader.uniforms.enabled.value = enabled;
    },
    track,
    dispose() {
      colorTarget.dispose();
      normalTarget.depthTexture?.dispose();
      normalTarget.dispose();
      shader.dispose();
      quadScene.traverse((o) => o.geometry?.dispose());
      for (const n of normalCache.values()) n.dispose();
    },
    render() {
      renderer.setRenderTarget(colorTarget);
      renderer.render(scene, camera);
      const bg = scene.background;
      renderer.getClearColor(clear);
      for (const d of drawables) {
        d.normal.uniforms.tMap.value = d.base.map || null;
        d.normal.uniforms.alpha.value = d.base.opacity ?? 1;
        d.o.material = d.normal;
        if (d.o.userData.noInk) d.normal.visible = false;
      }
      scene.background = new THREE.Color("#808080");
      const shadows = renderer.shadowMap.enabled;
      renderer.shadowMap.enabled = false;
      renderer.setRenderTarget(normalTarget);
      renderer.render(scene, camera);
      renderer.shadowMap.enabled = shadows;
      for (const d of drawables) d.o.material = d.original;
      scene.background = bg;
      renderer.setRenderTarget(null);
      renderer.render(quadScene, quadCamera);
    },
  };
}
