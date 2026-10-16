// A small tabletop screen-printing press in the same toon style as the campus
// diorama: lower the screen, pull the squeegee, lift the screen, see the print.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type State = 'open' | 'ready' | 'inked' | 'done';
type Busy = 'none' | 'lower' | 'squeegee' | 'park';

const deg = Math.PI / 180;
const OPEN_ANGLE = 64 * deg;
const PIVOT = new THREE.Vector3(0, 1.03, -2.3);
const STROKE_FROM = -1.5;
const STROKE_TO = 1.86;
const PRINT_CENTER_Z = 0.22;
const PRINT_SIZE = 1.6;

const colors = {
  ink: '#131A22',
  yellow: '#FFBF09',
  metal: '#3A4250',
  frame: '#D6AD7D',
  platen: '#5C6573',
  shirt: '#FFFFFF',
  emulsion: '#7FBCCF',
  rubber: '#2A2F38',
  handle: '#E6A85A',
};

const ease = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** Draws the print motif (MatriX “X” plus wordmark) in white on transparent. */
function motifCanvas(logoPath: string, logoBox: number[]) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#fff';
  const [x, y, w, h] = logoBox;
  const scale = 560 / h;
  c.save();
  c.translate(512 - (w * scale) / 2, 70);
  c.scale(scale, scale);
  c.translate(-x, -y);
  c.fill(new Path2D(logoPath));
  c.restore();
  c.font = '190px Boogaloo, "Arial Narrow", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.fillText('Die MatriX', 512, 900);
  return canvas;
}

/** Fine mesh grid on the emulsion, so the screen reads as fabric. */
function meshCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.fillStyle = colors.emulsion;
  c.fillRect(0, 0, 256, 256);
  c.strokeStyle = 'rgba(255,255,255,.22)';
  c.lineWidth = 1;
  for (let i = 0; i <= 256; i += 8) {
    c.beginPath(); c.moveTo(i + .5, 0); c.lineTo(i + .5, 256); c.stroke();
    c.beginPath(); c.moveTo(0, i + .5); c.lineTo(256, i + .5); c.stroke();
  }
  return canvas;
}

function shadowCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  const g = c.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, 'rgba(19,26,34,.2)');
  g.addColorStop(.6, 'rgba(19,26,34,.08)');
  g.addColorStop(1, 'rgba(19,26,34,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  return canvas;
}

/**
 * Outline hull with each vertex pushed along the mean of its distinct face
 * directions, so flat parts (the shirt) get an even rim, not a lift.
 */
function hullGeometry(source: THREE.BufferGeometry) {
  const plain = source.clone();
  plain.deleteAttribute('normal');
  plain.deleteAttribute('uv');
  const merged = mergeVertices(plain, 1e-3);
  const position = merged.getAttribute('position');
  const index = merged.getIndex()!;
  const directions: THREE.Vector3[][] = Array.from({ length: position.count }, () => []);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    a.fromBufferAttribute(position, ids[0]);
    b.fromBufferAttribute(position, ids[1]);
    c.fromBufferAttribute(position, ids[2]);
    const normal = c.sub(b).cross(a.sub(b)).normalize();
    if (!Number.isFinite(normal.x) || normal.lengthSq() === 0) continue;
    for (const id of ids) if (!directions[id].some(d => d.dot(normal) > .985)) directions[id].push(normal.clone());
  }
  const normals = new Float32Array(position.count * 3);
  directions.forEach((list, i) => {
    const sum = list.reduce((acc, d) => acc.add(d), new THREE.Vector3()).normalize();
    normals.set([sum.x, sum.y, sum.z], i * 3);
  });
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return merged;
}

function shirtShape() {
  const s = new THREE.Shape();
  s.moveTo(-.45, 1.72);
  s.quadraticCurveTo(0, 1.25, .45, 1.72);
  s.lineTo(1.18, 1.56);
  s.lineTo(1.8, .98);
  s.lineTo(1.46, .56);
  s.lineTo(1.12, .78);
  s.lineTo(1.12, -1.66);
  s.quadraticCurveTo(0, -1.76, -1.12, -1.66);
  s.lineTo(-1.12, .78);
  s.lineTo(-1.46, .56);
  s.lineTo(-1.8, .98);
  s.lineTo(-1.18, 1.56);
  s.closePath();
  return s;
}

export async function initScreenPrint(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>('[data-print-stage]')!;
  const instruction = root.querySelector<HTMLElement>('[data-print-instruction]')!;
  const inks = ['#E8524E', '#7C64D6', '#2F8AD6', '#5E9E12'];
  let inkIndex = 0;
  const logo = root.dataset.logoPath!;
  const logoBox = root.dataset.logoBox!.split(' ').map(Number);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // The wordmark on the print uses the display face.
  await document.fonts.load('190px Boogaloo').catch(() => {});
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    root.dataset.fallback = '';
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.localClippingEnabled = true;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, .1, 100);
  const cameraHome = new THREE.Vector3(9.2, 9.4, 13.4);
  const lookAt = new THREE.Vector3(0, 1.75, .1);
  scene.add(new THREE.HemisphereLight('#ffffff', '#c9b9a8', 1.55));
  const sun = new THREE.DirectionalLight('#ffffff', 2.1);
  sun.position.set(4, 10, 7);
  scene.add(sun);

  const ramp = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  const toon = (color: string, extra: THREE.MeshToonMaterialParameters = {}) => new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...extra });

  // Inverted-hull outline: a back-facing copy pushed out along smoothed normals.
  const outlineMaterial = new THREE.ShaderMaterial({
    uniforms: { thickness: { value: .028 }, color: { value: new THREE.Color(colors.ink) } },
    vertexShader: 'uniform float thickness; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * thickness, 1.0); }',
    fragmentShader: 'uniform vec3 color; void main() { gl_FragColor = vec4(color, 1.0); }',
    side: THREE.BackSide,
  });
  const solid = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.add(new THREE.Mesh(hullGeometry(geometry), outlineMaterial));
    parent.add(mesh);
    return mesh;
  };
  const box = (w: number, h: number, d: number, r = .06) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * .98);

  const press = new THREE.Group();
  scene.add(press);

  // Floor shadow.
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(10, 9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas()), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(.2, -.01, .3);
  press.add(shadow);

  // Base, platen and the rear hinge posts.
  const yellow = toon(colors.yellow);
  const metal = toon(colors.metal);
  solid(box(6.6, .3, 5.8, .12), yellow, press, 0, .15, .1);
  solid(box(.7, .5, .7, .08), metal, press, 0, .52, .25);
  solid(box(3.6, .16, 4.05, .06), toon(colors.platen), press, 0, .76, .25);
  for (const x of [-1.45, 1.45]) {
    solid(box(.66, .78, .62, .08), yellow, press, x, .68, -2.45);
    solid(new THREE.CylinderGeometry(.2, .2, .16, 20), metal, press, x + Math.sign(x) * .41, 1.03, -2.3).rotation.z = Math.PI / 2;
  }
  solid(new THREE.CylinderGeometry(.09, .09, 3.6, 16), metal, press, 0, PIVOT.y, PIVOT.z).rotation.z = Math.PI / 2;

  // Shirt on the platen.
  const shirtGeometry = new THREE.ExtrudeGeometry(shirtShape(), { depth: .03, bevelEnabled: true, bevelSize: .025, bevelThickness: .02, bevelSegments: 2, curveSegments: 12 });
  shirtGeometry.rotateX(-Math.PI / 2);
  shirtGeometry.scale(.9, 1, .9);
  solid(shirtGeometry, toon(colors.shirt), press, 0, .855, .25);

  const motif = new THREE.CanvasTexture(motifCanvas(logo, logoBox));
  motif.colorSpace = THREE.SRGBColorSpace;
  motif.anisotropy = 4;
  const strokeClip = new THREE.Plane(new THREE.Vector3(0, 0, -1), STROKE_FROM);
  const inkColor = new THREE.Color(inks[0]);

  const printMaterial = new THREE.MeshToonMaterial({ color: inkColor, gradientMap: ramp, map: motif, transparent: true, depthWrite: false, clippingPlanes: [strokeClip], polygonOffset: true, polygonOffsetFactor: -2 });
  const print = new THREE.Mesh(new THREE.PlaneGeometry(PRINT_SIZE, PRINT_SIZE), printMaterial);
  print.rotation.x = -Math.PI / 2;
  print.position.set(0, .912, PRINT_CENTER_Z);
  print.renderOrder = 0;
  press.add(print);

  // The hinged screen. Its origin sits on the hinge axis.
  const screen = new THREE.Group();
  screen.position.copy(PIVOT);
  press.add(screen);
  const frameMaterial = toon(colors.frame);
  const frameZ = (z: number) => z - PIVOT.z;
  solid(box(4.2, .26, .32), frameMaterial, screen, 0, 0, frameZ(-1.94));
  solid(box(4.2, .26, .32), frameMaterial, screen, 0, 0, frameZ(2.34));
  solid(box(.32, .26, 4.6), frameMaterial, screen, -1.94, 0, frameZ(.2));
  solid(box(.32, .26, 4.6), frameMaterial, screen, 1.94, 0, frameZ(.2));
  for (const x of [-1.45, 1.45]) {
    solid(box(.6, .14, .7, .05), metal, screen, x, .2, frameZ(-2.05));
    solid(new THREE.CylinderGeometry(.13, .13, .22, 16), yellow, screen, x, .38, frameZ(-2.05));
  }
  const meshTexture = new THREE.CanvasTexture(meshCanvas());
  meshTexture.colorSpace = THREE.SRGBColorSpace;
  meshTexture.wrapS = meshTexture.wrapT = THREE.RepeatWrapping;
  meshTexture.repeat.set(5, 5);
  const fabric = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.0), toon('#ffffff', { map: meshTexture, side: THREE.DoubleSide, transparent: true, opacity: .93 }));
  fabric.rotation.x = -Math.PI / 2;
  fabric.position.set(0, -.08, frameZ(.2));
  fabric.renderOrder = 1;
  screen.add(fabric);
  // Open stencil: the motif is washed out of the emulsion.
  const stencil = new THREE.Mesh(new THREE.PlaneGeometry(PRINT_SIZE, PRINT_SIZE), new THREE.MeshBasicMaterial({ color: '#E3F4F7', map: motif, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }));
  stencil.rotation.x = -Math.PI / 2;
  stencil.position.set(0, -.075, frameZ(PRINT_CENTER_Z));
  stencil.renderOrder = 2;
  screen.add(stencil);
  const flood = new THREE.Mesh(stencil.geometry, new THREE.MeshBasicMaterial({ color: inkColor, map: motif, transparent: true, depthWrite: false, side: THREE.DoubleSide, clippingPlanes: [strokeClip], polygonOffset: true, polygonOffsetFactor: -2 }));
  flood.rotation.x = -Math.PI / 2;
  flood.position.set(0, -.07, frameZ(PRINT_CENTER_Z));
  flood.renderOrder = 3;
  screen.add(flood);
  // Ink bead that rides in front of the squeegee blade.
  const bead = solid(box(3.15, .12, .32, .06), toon('#ffffff', { color: inkColor }), screen, 0, -.02, frameZ(STROKE_FROM + .32));

  // Front handle.
  const handleMaterial = toon(colors.yellow, { emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0 });
  const handle = new THREE.Group();
  handle.position.set(0, 0, frameZ(2.5));
  screen.add(handle);
  solid(box(.16, .16, .42, .05), metal, handle, -.55, 0, .12);
  solid(box(.16, .16, .42, .05), metal, handle, .55, 0, .12);
  solid(box(1.5, .26, .26, .12), handleMaterial, handle, 0, 0, .4);

  // Squeegee: parked beside the press, it hops into the screen once lowered.
  const squeegeeMaterial = toon(colors.handle, { emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0 });
  const squeegee = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.rotation.x = 14 * deg;
  squeegee.add(tilt);
  solid(box(3.3, .34, .1, .03), toon(colors.rubber), tilt, 0, .17, 0);
  solid(box(3.5, .62, .2, .08), squeegeeMaterial, tilt, 0, .62, 0);
  scene.add(squeegee);
  const parkPosition = new THREE.Vector3(2.78, .3, .35);
  const parkQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
  const strokeQuaternion = new THREE.Quaternion();
  const strokePosition = (t: number) => new THREE.Vector3(0, PIVOT.y - .08, STROKE_FROM + (STROKE_TO - STROKE_FROM) * t);

  let state: State = 'open';
  let lower = 0;
  let stroke = 0;
  let park = 0; // 0 parked, 1 inside the screen
  let busy: Busy = 'none';
  let tween = { from: 0, to: 0, start: 0, duration: 0, apply: (_v: number) => {}, done: () => {} };

  function setLower(value: number) {
    lower = clamp01(value);
    screen.rotation.x = -(1 - lower) * OPEN_ANGLE;
  }
  function setStroke(value: number) {
    stroke = clamp01(value);
    const z = STROKE_FROM + (STROKE_TO - STROKE_FROM) * stroke;
    strokeClip.constant = stroke === 0 ? -99 : z;
    bead.position.z = frameZ(Math.min(z + .3, 2.05));
    bead.scale.set(1, 1 - stroke * .35, 1 - stroke * .4);
    if (park === 1) squeegee.position.copy(strokePosition(stroke));
  }
  function setPark(value: number) {
    park = clamp01(value);
    const target = strokePosition(stroke);
    squeegee.position.lerpVectors(parkPosition, target, park);
    squeegee.position.y += Math.sin(park * Math.PI) * 1.4;
    squeegee.quaternion.slerpQuaternions(parkQuaternion, strokeQuaternion, park);
  }
  function animate(kind: Busy, from: number, to: number, duration: number, apply: (v: number) => void, done: () => void) {
    if (reduced.matches) { apply(to); done(); return; }
    busy = kind;
    tween = { from, to, start: performance.now(), duration, apply, done };
    wake();
  }
  function stepTween(time: number) {
    if (busy === 'none') return;
    const t = Math.min(1, (time - tween.start) / tween.duration);
    tween.apply(tween.from + (tween.to - tween.from) * ease(t));
    if (t >= 1) { busy = 'none'; tween.done(); }
  }

  function update() {
    root.dataset.state = state;
    instruction.textContent = {
      open: 'Klick auf die Presse: Sieb runter.',
      ready: 'Rakel ziehen.',
      inked: 'Sieb hoch.',
      done: 'Frisch gedruckt! Noch mal?',
    }[state];
  }

  function lowerScreen() {
    animate('lower', lower, 1, 520, setLower, () => {
      animate('park', park, 1, 620, setPark, () => { state = 'ready'; update(); });
    });
  }
  function pullSqueegee(from = stroke) {
    // The squeegee goes back to its rest before the screen can be lifted.
    animate('squeegee', from, 1, 900, setStroke, () => {
      animate('park', park, 0, 620, setPark, () => { state = 'inked'; update(); });
    });
  }
  function liftScreen() {
    animate('lower', lower, 0, 620, setLower, () => { state = 'done'; update(); });
  }
  function reset() {
    // Every new print gets the next ink.
    inkIndex = (inkIndex + 1) % inks.length;
    inkColor.set(inks[inkIndex]);
    for (const m of [printMaterial, flood.material, bead.material] as THREE.MeshBasicMaterial[]) m.color.copy(inkColor);
    setStroke(0);
    state = 'open';
    update();
    wake();
  }
  function next() {
    if (busy !== 'none') return;
    if (state === 'open') lowerScreen();
    else if (state === 'ready') pullSqueegee();
    else if (state === 'inked') liftScreen();
    else reset();
  }

  stage.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); next(); }
  });

  // ---------- Direct manipulation ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const toScreen = (v: THREE.Vector3) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const p = v.clone().project(camera);
    return new THREE.Vector2((p.x + 1) / 2 * rect.width, (1 - p.y) / 2 * rect.height);
  };
  const handlePoint = (t: number) => {
    const angle = -(1 - t) * OPEN_ANGLE;
    return new THREE.Vector3(0, 0, frameZ(2.9)).applyAxisAngle(new THREE.Vector3(1, 0, 0), angle).add(PIVOT);
  };
  function hit(event: PointerEvent): 'handle' | 'squeegee' | null {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if ((state === 'open' || state === 'inked') && raycaster.intersectObject(handle, true).length) return 'handle';
    if (state === 'ready' && raycaster.intersectObject(squeegee, true).length) return 'squeegee';
    return null;
  }
  let drag: { id: number; part: 'handle' | 'squeegee'; x: number; y: number; start: number; a: THREE.Vector2; b: THREE.Vector2; moved: boolean } | null = null;
  let tap: { x: number; y: number } | null = null;
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (event) => {
    if (busy !== 'none' || event.button !== 0) return;
    const part = hit(event);
    // Anywhere else on the press, a tap simply runs the next step.
    if (!part) { tap = { x: event.clientX, y: event.clientY }; return; }
    event.preventDefault();
    const [a, b] = part === 'handle'
      ? [toScreen(handlePoint(0)), toScreen(handlePoint(1))]
      : [toScreen(strokePosition(0)), toScreen(strokePosition(1))];
    drag = { id: event.pointerId, part, x: event.clientX, y: event.clientY, start: part === 'handle' ? lower : stroke, a, b, moved: false };
    canvas.setPointerCapture(event.pointerId);
    root.dataset.dragging = '';
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) {
      if (event.pointerType === 'mouse') canvas.style.cursor = hit(event) ? 'grab' : 'pointer';
      return;
    }
    if (event.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return;
    drag.moved = true;
    const axis = drag.b.clone().sub(drag.a);
    const delta = new THREE.Vector2(event.clientX - drag.x, event.clientY - drag.y);
    let value = drag.start + delta.dot(axis) / axis.lengthSq();
    if (drag.part === 'handle') {
      // Dragging up from the lowered state lifts the screen again.
      setLower(value);
    } else {
      value = Math.max(value, stroke); // ink only goes one way
      setStroke(value);
    }
    canvas.style.cursor = 'grabbing';
    wake();
  });
  const endDrag = (event: PointerEvent) => {
    if (tap) {
      const moved = Math.hypot(event.clientX - tap.x, event.clientY - tap.y);
      tap = null;
      if (event.type === 'pointerup' && moved < 6) next();
      return;
    }
    if (!drag || event.pointerId !== drag.id) return;
    const { part, moved } = drag;
    drag = null;
    delete root.dataset.dragging;
    canvas.style.cursor = '';
    if (!moved) { next(); return; }
    if (part === 'handle') {
      if (state === 'open') lower > .4 ? lowerScreen() : animate('lower', lower, 0, 300, setLower, () => {});
      else if (lower < .65) liftScreen();
      else animate('lower', lower, 1, 300, setLower, () => {});
    } else if (stroke > .55) pullSqueegee(stroke);
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // Subtle parallax that follows the pointer over the stage.
  const parallax = new THREE.Vector2();
  const parallaxTarget = new THREE.Vector2();
  if (matchMedia('(hover: hover)').matches && !reduced.matches) {
    stage.addEventListener('pointermove', (event) => {
      if (drag) return;
      const rect = stage.getBoundingClientRect();
      parallaxTarget.set((event.clientX - rect.left) / rect.width - .5, (event.clientY - rect.top) / rect.height - .5);
      wake();
    });
    stage.addEventListener('pointerleave', () => { parallaxTarget.set(0, 0); wake(); });
  }

  // ---------- Render loop (only while visible) ----------
  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Pull back on tall/narrow stages so the raised screen always fits.
    baseZoom = Math.min(1, camera.aspect / 1.22);
    wake();
  }
  let baseZoom = 1;
  let visible = false;
  let frame = 0;
  function render(time: number) {
    frame = 0;
    stepTween(time);
    parallax.lerp(parallaxTarget, .08);
    camera.position.copy(cameraHome).add(new THREE.Vector3(parallax.x * 2.4, -parallax.y * 1.4, -parallax.x * 1.2));
    // Frame the raised screen when open, move in on the platen when lowered.
    camera.lookAt(lookAt.x, lookAt.y - lower * .6, lookAt.z + lower * .2);
    camera.zoom = baseZoom * (1 + lower * .16);
    camera.updateProjectionMatrix();
    const pulse = reduced.matches || drag || busy !== 'none' ? 0 : (Math.sin(time / 260) * .5 + .5) * .32;
    handleMaterial.emissiveIntensity = state === 'open' || state === 'inked' ? pulse : 0;
    squeegeeMaterial.emissiveIntensity = state === 'ready' ? pulse : 0;
    renderer.render(scene, camera);
    const settling = parallax.distanceTo(parallaxTarget) > .001;
    if (visible && (busy !== 'none' || drag || pulse || settling || state === 'open' || state === 'ready' || state === 'inked')) wake();
  }
  function wake() { if (visible && !frame) frame = requestAnimationFrame(render); }

  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake(); else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }).observe(stage);

  setLower(0);
  setStroke(0);
  setPark(0);
  update();
  resize();
  root.dataset.ready = '';
}
