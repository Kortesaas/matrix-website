// The Roadrunner (Streetwork bus) driving around the house. All settings live
// in src/data/campus-roadrunner.js; this file builds the vehicle, follows the
// route and tells the scene when it needs frames, so the diorama can keep
// rendering on demand: frames while driving, none while it waits at a stop.
// While parked it gets a "+" marker (campus.ts, id "roadrunner"); the scene
// holds it at its stop while that card is open.
import * as THREE from "three";
import { toonify } from "./comic.js";

/** Whether the bus appears at all (config, or ?roadrunner for a preview). */
export function roadrunnerWanted(config) {
  return config.enabled || new URLSearchParams(location.search).has("roadrunner");
}

/**
 * @param {typeof import('../../data/campus-roadrunner.js').roadrunner} config
 * @param {{ palette: any, phone: boolean, reducedMotion: boolean }} options
 */
export function createRoadrunner(config, { palette, phone, reducedMotion }) {
  const group = new THREE.Group();
  group.name = "Roadrunner";
  const vehicle = new THREE.Group();
  group.add(vehicle);
  const look = config.appearance;
  const wheels = [];
  let wheelRadius = 0.4;

  if (look.kind === "bus") {
    const painted = look.colors === "livery";
    wheelRadius = buildBus(vehicle, look, wheels, painted);
    if (!painted) toonify(vehicle)(palette);
  }
  // "model" and "sprite" are added by load(), once the scene runs.

  // Soft ground shadow that moves along (the real shadow map is static).
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 24),
    new THREE.MeshBasicMaterial({ color: palette.color(0.5, 0.44), transparent: true, opacity: 0.24, depthWrite: false }),
  );
  blob.name = "Roadrunner shadow";
  blob.rotation.x = -Math.PI / 2;
  blob.scale.set(look.length * 1.12, look.width * 1.35, 1);
  blob.position.y = 0.01;
  blob.userData.noInk = true;
  group.add(blob);

  group.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = false;
    o.receiveShadow = o !== blob;
  });

  // ---------- Route ----------
  const path = buildPath(config.route.points, config.route.closed, config.route.cornerRadius);
  const stops = config.route.stops.map((stop) => ({ s: path.nearest(stop.at), seconds: stop.seconds, waitForVisit: !!stop.waitForVisit }));
  const parkS = path.nearest(config.park.at);
  const drives = !(reducedMotion && config.reducedMotion === "park") && !(phone && !config.mobile);
  const step = phone ? 1 / Math.max(1, config.mobileFps) : 0;
  const startStop = stops.findIndex((st) => Math.abs(st.s - parkS) < 0.5);

  let s = parkS;
  let v = 0;
  // Pulls out right away on load; stops only come into play after a lap.
  let waitUntil = drives ? performance.now() : Infinity;
  let justLeft = startStop;
  let held = false;
  let spin = 0;
  let time = 0;
  let previousHeading = null;
  let acc = 0;

  const ahead = (target) => (((target - s) % path.length) + path.length) % path.length;
  const nextStop = () => {
    let best = null;
    stops.forEach((stop, index) => {
      let d = ahead(stop.s);
      if (index === justLeft && d < 0.5) d += path.length;
      if (!best || d < best.d) best = { d, index, stop };
    });
    return best;
  };
  const waiting = () => !drives || performance.now() < waitUntil;

  function place(dt) {
    const { x, z, heading } = drives ? path.at(s) : { x: config.park.at[0], z: config.park.at[1], heading: config.park.heading };
    group.position.set(x, config.groundY, z);
    group.rotation.y = -heading + look.yawOffset;
    const anim = config.animation;
    const speedShare = config.route.speed ? v / config.route.speed : 0;
    let turn = 0;
    if (previousHeading !== null && dt > 0) {
      let dh = heading - previousHeading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      turn = dh / dt;
    }
    previousHeading = heading;
    vehicle.rotation.x = THREE.MathUtils.clamp(-turn * anim.lean * speedShare, -anim.lean, anim.lean);
    vehicle.position.y = anim.bounce * speedShare * Math.abs(Math.sin(time * 9));
    if (anim.wheels) for (const w of wheels) w.rotation.z = -spin;
  }

  /**
   * Advances the bus.
   * @returns {number} 0 to keep drawing frames, otherwise seconds until it
   *   needs frames again (Infinity: never, e.g. parked for good or held).
   */
  function update(dt) {
    if (!drives) {
      place(0);
      return Infinity;
    }
    const now = performance.now();
    if (now < waitUntil) return (waitUntil - now) / 1000;
    // Phones: a lower, steady frame rate while driving.
    if (step) {
      acc += dt;
      if (acc < step) return 0;
      dt = acc;
      acc = 0;
    }
    time += dt;
    const cfg = config.route;
    const target = nextStop();
    const brake = target ? Math.sqrt(2 * cfg.acceleration * target.d) : Infinity;
    const want = Math.min(cfg.speed, brake);
    v = want > v ? Math.min(want, v + cfg.acceleration * dt) : want;
    const move = Math.max(v, 0.15) * dt;
    if (target && move >= target.d) {
      s = target.stop.s;
      v = 0;
      justLeft = target.index;
      // A stop that waits for a visit stays until its card was opened and closed.
      const stay = held || target.stop.waitForVisit;
      waitUntil = stay ? Infinity : now + target.stop.seconds * 1000;
      spin += target.d / wheelRadius;
      place(dt);
      return stay ? Infinity : target.stop.seconds;
    }
    s = (s + move) % path.length;
    spin += move / wheelRadius;
    // Clear of the stop it pulled out of: it counts again on the next lap.
    if (justLeft >= 0 && ahead(stops[justLeft].s) < path.length - 0.5) justLeft = -1;
    place(dt);
    return 0;
  }

  async function load(trackForInk) {
    if (look.kind === "model" && look.src) {
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const gltf = await new GLTFLoader().loadAsync(look.src);
      const model = gltf.scene;
      fitTo(model, look);
      model.traverse((o) => {
        if (o.isMesh) o.receiveShadow = true;
        if (/^wheel/i.test(o.name)) wheels.push(o);
      });
      if (look.colors === "palette") toonify(model)(palette);
      vehicle.add(model);
      trackForInk(model);
    } else if (look.kind === "sprite" && look.src) {
      const texture = await new THREE.TextureLoader().loadAsync(look.src);
      texture.colorSpace = THREE.SRGBColorSpace;
      const aspect = texture.image.width / texture.image.height;
      const sprite = new THREE.Mesh(
        new THREE.PlaneGeometry(look.height * aspect, look.height),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide }),
      );
      sprite.name = "Roadrunner sprite";
      sprite.position.y = look.height / 2;
      sprite.userData.billboard = true;
      vehicle.add(sprite);
      trackForInk(sprite);
    }
  }

  place(0);
  return {
    group,
    update,
    load,
    /** True while the bus stands at a stop (or is parked for good): its "+" shows. */
    parked: waiting,
    /** Where its "+" is anchored: on the roof, wherever the bus is. */
    markerPoint(target) {
      return target.set(group.position.x, config.groundY + look.height + 0.2, group.position.z);
    },
    /** Keeps the bus at its stop while its card is open; closing it sends the bus on its next lap (true then). */
    hold(on) {
      held = on;
      if (!drives) return false;
      if (on && waiting()) waitUntil = Infinity;
      if (!on && waitUntil === Infinity) {
        waitUntil = performance.now() + 1500;
        return true;
      }
      return false;
    },
    /** Sprites face the camera like the illustrated trees. */
    updateCamera(camera) {
      vehicle.traverse((o) => {
        if (!o.userData.billboard) return;
        const parentRotation = new THREE.Quaternion();
        o.parent?.getWorldQuaternion(parentRotation);
        o.quaternion.copy(camera.quaternion).premultiply(parentRotation.invert());
      });
    },
  };
}

/** Scales and grounds a loaded model to the configured length. */
function fitTo(model, look) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = look.length / Math.max(size.x, size.z, 0.001);
  model.scale.setScalar(scale);
  const grounded = new THREE.Box3().setFromObject(model);
  model.position.y -= grounded.min.y;
}

/**
 * A closed (or open) route of straight segments with rounded corners,
 * sampled into a polyline. at(s) gives position and heading at distance s.
 */
function buildPath(points, closed, radius) {
  const P = points.map(([x, z]) => new THREE.Vector2(x, z));
  const n = P.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = P[i];
    const prev = P[(i - 1 + n) % n];
    const next = P[(i + 1) % n];
    if (!closed && (i === 0 || i === n - 1)) {
      out.push(p.clone());
      continue;
    }
    const a = prev.clone().sub(p).normalize();
    const b = next.clone().sub(p).normalize();
    const angle = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1));
    const trim = Math.min(radius / Math.tan(angle / 2), p.distanceTo(prev) / 2, p.distanceTo(next) / 2);
    const start = p.clone().addScaledVector(a, trim);
    const end = p.clone().addScaledVector(b, trim);
    // Quadratic Bézier through the corner: smooth enough for a small bus.
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      const u = 1 - t;
      out.push(new THREE.Vector2(
        u * u * start.x + 2 * u * t * p.x + t * t * end.x,
        u * u * start.y + 2 * u * t * p.y + t * t * end.y,
      ));
    }
  }
  if (closed) out.push(out[0].clone());
  const lengths = [0];
  for (let i = 1; i < out.length; i++) lengths.push(lengths[i - 1] + out[i].distanceTo(out[i - 1]));
  const length = lengths[lengths.length - 1];

  const segmentAt = (s) => {
    let lo = 0;
    let hi = lengths.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lengths[mid] <= s) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  return {
    length,
    at(s) {
      s = ((s % length) + length) % length;
      const i = segmentAt(s);
      const a = out[i];
      const b = out[Math.min(i + 1, out.length - 1)];
      const seg = lengths[i + 1] - lengths[i] || 1;
      const t = (s - lengths[i]) / seg;
      return { x: a.x + (b.x - a.x) * t, z: a.y + (b.y - a.y) * t, heading: Math.atan2(b.y - a.y, b.x - a.x) };
    },
    /** Distance along the route closest to a point. */
    nearest([x, z]) {
      const q = new THREE.Vector2(x, z);
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < out.length - 1; i++) {
        const a = out[i];
        const ab = out[i + 1].clone().sub(a);
        const t = THREE.MathUtils.clamp(q.clone().sub(a).dot(ab) / (ab.lengthSq() || 1), 0, 1);
        const d = a.clone().addScaledVector(ab, t).distanceTo(q);
        if (d < bestD) {
          bestD = d;
          best = lengths[i] + t * ab.length();
        }
      }
      return best;
    },
  };
}

// ---------- The bus ----------
// Modelled on the real Streetwork bus (a Mercedes MB 100 from the photos):
// a one-box van with a short nose, white below and sky blue above, a band of
// clouds, yellow lettering ("ROAD RUNNER" on the driver's side, "STREETWORK"
// on the other and on the front), black bumpers. Nose along +x, so the
// driver's (left) side faces −z. Paint is drawn into canvas textures.

const SKY = "#a8d8f5";
const SPLASH = "#4d9ddb";
const DEEP = "#2c74c4";
const CLOUD_LINE = "#9fb4c6";
const GLASS = "#5f87a6";
const LINE = "#131a22";

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function texture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function seeded(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

/** Sky-blue paint with darker splashes, fading into white towards `whiteFrom`. */
function paintSky(g, w, h, whiteFrom, seed, splashes = 70) {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, w, h);
  g.fillStyle = SKY;
  g.fillRect(0, 0, w, h * whiteFrom);
  const r = seeded(seed);
  g.fillStyle = SPLASH;
  for (let i = 0; i < splashes; i++) {
    const x = r() * w;
    const y = r() * h * whiteFrom * 0.95;
    g.beginPath();
    g.ellipse(x, y, 6 + r() * 18, 3 + r() * 7, r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
}

/** A band of cartoon clouds along the lower body. */
function paintClouds(g, w, top, bottom, seed) {
  const r = seeded(seed);
  g.lineWidth = 3;
  g.strokeStyle = CLOUD_LINE;
  g.fillStyle = "#ffffff";
  for (let i = 0; i < 46; i++) {
    const x = r() * w;
    const y = top + r() * (bottom - top);
    const rad = 14 + r() * 26;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.fillRect(0, bottom - 6, w, 200);
}

function rounded(g, x, y, w, h, rad) {
  g.beginPath();
  g.roundRect(x, y, w, h, rad);
}

/** Blue-grey window with a thick outline and a bright reflection. */
function paintWindow(g, x, y, w, h) {
  rounded(g, x, y, w, h, 14);
  g.fillStyle = GLASS;
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = LINE;
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.34)";
  g.beginPath();
  g.moveTo(x + w * 0.12, y + h - 8);
  g.lineTo(x + w * 0.32, y + 8);
  g.lineTo(x + w * 0.42, y + 8);
  g.lineTo(x + w * 0.22, y + h - 8);
  g.fill();
}

/** Graffiti-style yellow lettering with a brown outline. */
function paintLettering(g, text, x, y, size, angle = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.font = `${size}px Boogaloo, Impact, "Arial Black", sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.lineWidth = size * 0.16;
  g.strokeStyle = "#5a3410";
  g.strokeText(text, 0, 0);
  const grad = g.createLinearGradient(0, -size / 2, 0, size / 2);
  grad.addColorStop(0, "#ffd84a");
  grad.addColorStop(1, "#e88a12");
  g.fillStyle = grad;
  g.fillText(text, 0, 0);
  g.restore();
}

/** One long side. `front` is "left" or "right" in the image. */
function sideTexture(front, lettering, seed) {
  const W = 1024;
  const H = 512;
  const [c, g] = canvas(W, H);
  paintSky(g, W, H, 0.62, seed);
  // Windows: cab, sliding door pair, rear (positions from the photo).
  const at = (u, w) => (front === "left" ? u * W : W - (u + w) * W);
  paintWindow(g, at(0.035, 0.17), 46, 0.17 * W, 150);
  paintWindow(g, at(0.3, 0.33), 46, 0.33 * W, 150);
  paintWindow(g, at(0.66, 0.29), 46, 0.29 * W, 150);
  g.strokeStyle = LINE;
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(at(0.465, 0), 50);
  g.lineTo(at(0.465, 0), 192);
  g.stroke();
  paintClouds(g, W, H * 0.55, H * 0.86, seed + 7);
  // A blue speed swoosh behind the lettering.
  g.fillStyle = DEEP;
  g.beginPath();
  const sx = front === "left" ? 0.06 * W : 0.94 * W;
  const dir = front === "left" ? 1 : -1;
  g.moveTo(sx, 290);
  g.quadraticCurveTo(sx + dir * 160, 230, sx + dir * 330, 270);
  g.quadraticCurveTo(sx + dir * 170, 300, sx, 330);
  g.fill();
  if (lettering === "ROAD RUNNER") {
    paintLettering(g, "ROAD RUNNER", W * (front === "left" ? 0.62 : 0.38), 330, 128, -0.12 * dir);
  } else {
    paintLettering(g, lettering, W * (front === "left" ? 0.6 : 0.4), 320, 96, -0.06 * dir);
  }
  // Dark rocker strip.
  g.fillStyle = "#3a3f45";
  g.fillRect(0, H - 34, W, 34);
  return texture(c);
}

function noseTexture() {
  const [c, g] = canvas(512, 256);
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 512, 256);
  // Sky-blue band with the yellow lettering above the grille, like the real bus.
  g.fillStyle = SKY;
  g.fillRect(0, 0, 512, 96);
  paintLettering(g, "STREETWORK", 256, 52, 66);
  // Black grille with the star, headlights, orange indicators.
  g.fillStyle = "#23282e";
  rounded(g, 150, 118, 212, 96, 10);
  g.fill();
  g.strokeStyle = "#5c636b";
  g.lineWidth = 5;
  for (let y = 136; y < 206; y += 18) {
    g.beginPath();
    g.moveTo(164, y);
    g.lineTo(348, y);
    g.stroke();
  }
  g.strokeStyle = "#e6e9ec";
  g.lineWidth = 6;
  g.beginPath();
  g.arc(256, 166, 22, 0, Math.PI * 2);
  g.stroke();
  for (let k = 0; k < 3; k++) {
    const a = -Math.PI / 2 + (k * Math.PI * 2) / 3;
    g.beginPath();
    g.moveTo(256, 166);
    g.lineTo(256 + Math.cos(a) * 22, 166 + Math.sin(a) * 22);
    g.stroke();
  }
  for (const x of [26, 398]) {
    g.fillStyle = "#e9f4fb";
    rounded(g, x, 118, 88, 64, 10);
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = LINE;
    g.stroke();
    g.fillStyle = "#ff9d1c";
    rounded(g, x, 190, 88, 36, 6);
    g.fill();
    g.stroke();
  }
  return texture(c);
}

function backTexture() {
  const [c, g] = canvas(512, 512);
  paintSky(g, 512, 512, 0.6, 5);
  paintWindow(g, 40, 40, 200, 160);
  paintWindow(g, 272, 40, 200, 160);
  paintClouds(g, 512, 290, 440, 17);
  for (const x of [10, 466]) {
    g.fillStyle = "#c8202b";
    rounded(g, x, 300, 36, 110, 6);
    g.fill();
    g.lineWidth = 5;
    g.strokeStyle = LINE;
    g.stroke();
  }
  return texture(c);
}

function roofTexture() {
  const [c, g] = canvas(256, 128);
  paintSky(g, 256, 128, 1, 9, 12);
  return texture(c);
}

/** Builds the bus into `target`; returns the wheel radius. */
function buildBus(target, look, wheels, painted) {
  const L = look.length;
  const W = look.width;
  const H = look.height;
  const r = H * 0.16;
  const floor = r * 1.05;
  const noseLength = L * 0.13;
  const bodyLength = L - noseLength;
  const bodyX = -noseLength / 2;
  const noseHeight = (H - floor) * 0.42;
  const ramp = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 160, 160, 160, 255, 225, 225, 225, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat);
  ramp.needsUpdate = true;
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false;
  // Painted: toon materials with the livery; otherwise plain materials with
  // roles that toonify() tints in the page colour.
  const mat = (role, color, map) => {
    if (painted) return new THREE.MeshToonMaterial({ color: map ? "#ffffff" : color, map: map ?? null, gradientMap: ramp });
    const m = new THREE.MeshStandardMaterial({ color });
    m.userData.role = role;
    return m;
  };
  const liv = look.livery;
  const body = mat("wall", liv.body);
  const black = mat("metal", liv.trim);
  const tyre = mat("metal", liv.wheels);
  const hub = mat("white", "#d8dde2");
  const add = (name, geo, material, x, y, z, parent = target) => {
    const o = new THREE.Mesh(geo, material);
    o.name = name;
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };

  // Body box: +x front (windscreen), −x back, +y roof, −y floor, +z right, −z left.
  const bodyH = H - floor;
  add(
    "Bus body",
    new THREE.BoxGeometry(bodyLength, bodyH, W),
    painted
      ? [
          body,
          mat("wall", liv.body, backTexture()),
          mat("white", liv.roof, roofTexture()),
          black,
          mat("wall", liv.body, sideTexture("right", "STREETWORK", 41)),
          mat("wall", liv.body, sideTexture("left", "ROAD RUNNER", 23)),
        ]
      : body,
    bodyX,
    floor + bodyH / 2,
    0,
  );
  // Rounded roof edge: a slightly narrower cap.
  add("Bus roof", new THREE.BoxGeometry(bodyLength * 0.97, H * 0.04, W * 0.94), painted ? mat("white", liv.roof, roofTexture()) : mat("white", liv.roof), bodyX, H + H * 0.02, 0);
  // Short nose with grille and lights.
  add(
    "Bus nose",
    new THREE.BoxGeometry(noseLength, noseHeight, W * 0.98),
    painted ? [mat("wall", liv.body, noseTexture()), body, mat("white", "#ffffff"), black, mat("white", "#ffffff"), mat("white", "#ffffff")] : body,
    L / 2 - noseLength / 2,
    floor + noseHeight / 2,
    0,
  );
  // Slanted windscreen from the hood up to the roof (a wedge in front of
  // the body): glass on the slope, body colour on the two side triangles.
  const rise = H - floor - noseHeight;
  const run = noseLength * 0.85;
  const profile = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(run, 0), new THREE.Vector2(0, rise)]);
  const wedge = new THREE.ExtrudeGeometry(profile, { depth: W * 0.97, bevelEnabled: false });
  wedge.translate(0, 0, -W * 0.97 / 2);
  add("Bus windscreen", wedge, painted ? [mat("wall", SKY), mat("edge", GLASS)] : mat("edge", GLASS), L / 2 - noseLength, floor + noseHeight, 0);
  // Lights that stand out of the paint: glowing headlights on the nose (where
  // the texture draws them) and red tail lights on the back.
  const lamp = (color, glow) => {
    if (!painted) return mat("white", color);
    return new THREE.MeshToonMaterial({ color, emissive: glow, emissiveIntensity: 1, gradientMap: ramp });
  };
  const head = lamp("#fff8d6", "#ffe07a");
  const tail = lamp("#e0303a", "#a8101a");
  const noseW = W * 0.98;
  for (const side of [-1, 1]) {
    add("Bus headlight", new THREE.BoxGeometry(0.08, noseHeight * 0.32, noseW * 0.2), head, L / 2 + 0.04, floor + noseHeight * 0.41, side * noseW * 0.363);
    add("Bus tail light", new THREE.BoxGeometry(0.08, bodyH * 0.21, W * 0.09), tail, -L / 2 - 0.04, floor + bodyH * 0.31, side * W * 0.44);
  }
  // Bumpers, mirrors.
  add("Bus bumper front", new THREE.BoxGeometry(0.16, r * 0.62, W * 1.04), black, L / 2 + 0.02, floor * 0.92, 0);
  add("Bus bumper back", new THREE.BoxGeometry(0.16, r * 0.62, W * 1.04), black, -L / 2 + 0.02, floor * 0.92, 0);
  for (const side of [-1, 1]) {
    add("Bus mirror", new THREE.BoxGeometry(0.08, 0.32, 0.16), black, L / 2 - noseLength - 0.1, floor + bodyH * 0.55, side * (W / 2 + 0.12));
  }
  // Wheels: black tyres with silver hubs, turned around z while driving.
  const tyreGeo = new THREE.CylinderGeometry(r, r, W * 0.15, 18);
  tyreGeo.rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(r * 0.55, r * 0.55, W * 0.155, 12);
  hubGeo.rotateX(Math.PI / 2);
  for (const x of [L / 2 - noseLength - L * 0.06, -L / 2 + L * 0.19]) {
    for (const side of [-1, 1]) {
      const wheel = new THREE.Group();
      wheel.name = "wheel";
      wheel.position.set(x, r, side * (W / 2 - W * 0.07));
      add("Bus tyre", tyreGeo, tyre, 0, 0, 0, wheel);
      add("Bus hub", hubGeo, hub, 0, 0, side * 0.004, wheel);
      target.add(wheel);
      wheels.push(wheel);
    }
  }
  return r;
}
