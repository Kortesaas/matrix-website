// Die MatriX 3D diorama — mounts the scene into the Campus3D component.
// Behaviour follows the supplied demo (hover cutaway, walls before roof,
// bounded pointer camera, pinned cards); markers and cards are the site's own
// markup, and every colour comes from the page (--accent for the hue, --ink).
import * as THREE from "three";
import { createPointerCamera } from "./camera-motion.js";
import { createModel } from "./model.js";
import { createPalette, toonify, createComicLandscape, createComicRenderer, setInk } from "./comic.js";
import { createRoomHighlights } from "./highlights.js";

const S = 1 / 42;
const planX = (x) => (x - 1005) * S;
const planZ = (y) => (y - 620) * S;

/**
 * @param {HTMLElement} root the Campus3D element
 * @returns {{ destroy(): void } | null} null when WebGL is unavailable
 */
export function mountCampus(root) {
  const phone = matchMedia("(max-width: 600px)");
  const host = /** @type {HTMLElement} */ (root.querySelector("[data-campus-viewer]"));
  const hint = root.querySelector("[data-campus-hint]");
  const modeButtons = [...root.querySelectorAll("[data-campus-mode]")];

  // ---------- Colours from the page ----------
  const css = getComputedStyle(root);
  const read = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(read("--accent", "#907BE0")).getHSL(hsl, THREE.SRGBColorSpace);
  const ink = read("--ink", "#131A22");
  setInk(ink);
  const palette = createPalette(hsl.h * 360);

  // ---------- Renderer ----------
  let renderer;
  try {
    // Transparent canvas: the diorama sits directly on the page section.
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  host.prepend(canvas);

  // ---------- Scene ----------
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-50, 50, 35, -35, 0.1, 300);
  scene.add(new THREE.HemisphereLight("#ffffff", "#c0c0c0", 1.6));
  const sun = new THREE.DirectionalLight("#ffffff", 2.1);
  sun.position.set(-35, 60, 35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -57, right: 47, top: 47, bottom: -47, near: 1, far: 140 });
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 1;
  scene.add(sun, sun.target);

  const building = createModel();
  scene.add(building.model);
  const tintBuilding = toonify(building.model);
  const landscape = createComicLandscape(palette);
  const highlights = createRoomHighlights(ink);
  scene.add(landscape.group, highlights.group);
  tintBuilding(palette);
  highlights.setPalette(palette);

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const pointerCamera = createPointerCamera(camera, { enabled: !reducedMotion && canHover });

  const fadeGroups = [building.outside, building.inside, building.roof].map((group, index) => {
    const materials = new Map();
    const meshes = [];
    group.traverse((o) => {
      if (!o.isMesh) return;
      materials.set(o.material, { opacity: o.material.opacity, depthWrite: o.material.depthWrite });
      if (index !== 2) o.material.transparent = true;
      meshes.push({ o, shadow: o.castShadow });
    });
    return { group, materials, meshes };
  });
  const comic = createComicRenderer(renderer, scene, camera);

  // ---------- Render on demand ----------
  // The scene only redraws while something moves (camera easing, the house
  // opening, a highlight fading) and never while it is offscreen.
  let raf = 0;
  let last = 0;
  let inView = false;
  let peek = 0;
  const kick = () => {
    if (!raf && inView && !document.hidden) raf = requestAnimationFrame(frame);
  };

  // ---------- House: hover cutaway / held open ----------
  let manualInside = false;
  let hoverInside = false;
  let desired = false;
  let hoverTimer = 0;
  let pendingHover = null;

  function refreshDesired() {
    const pinned = active && pinnedCard && !active.outdoor;
    const next = manualInside || hoverInside || !!pinned;
    if (next !== desired) renderer.shadowMap.needsUpdate = true;
    desired = next;
    for (const b of modeButtons) {
      const on = (b.dataset.campusMode === "interior") === manualInside;
      b.setAttribute("aria-pressed", String(on));
    }
    if (hint) {
      hint.textContent = manualInside
        ? "Bleibt offen · Mit + entdecken"
        : desired
          ? "Mit + die Räume entdecken"
          : canHover
            ? "Über das Haus fahren · Mit + entdecken"
            : "„Offen halten“ tippen · Mit + entdecken";
    }
    const mobileToggle = root.querySelector('[data-campus-toggle]');
    mobileToggle?.setAttribute('aria-pressed', String(desired));
    const toggleLabel = mobileToggle?.querySelector('[data-toggle-label]');
    if (toggleLabel) toggleLabel.textContent = desired ? 'Haus schließen' : 'Haus öffnen';
    host.dataset.view = desired ? "inside" : "outside";
    kick();
  }

  function setHover(value) {
    if (value === hoverInside) {
      clearTimeout(hoverTimer);
      pendingHover = null;
      return;
    }
    if (value) {
      clearTimeout(hoverTimer);
      pendingHover = null;
      hoverInside = true;
      refreshDesired();
      return;
    }
    if (pendingHover === value) return;
    clearTimeout(hoverTimer);
    pendingHover = value;
    hoverTimer = window.setTimeout(() => {
      hoverInside = false;
      pendingHover = null;
      refreshDesired();
    }, 160);
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const mainBox = new THREE.Box3(new THREE.Vector3(-23, 0, -14.1), new THREE.Vector3(23, 4.1, 14.1));
  const hallBox = new THREE.Box3(new THREE.Vector3(-23, 0, -14.1), new THREE.Vector3(-2.1, 6.1, -2));
  let bounds = host.getBoundingClientRect();
  let boundsStale = false;
  const hostBounds = () => {
    if (boundsStale) {
      bounds = host.getBoundingClientRect();
      boundsStale = false;
    }
    return bounds;
  };
  function pointerOverHouse(e) {
    const b = hostBounds();
    pointer.set(((e.clientX - b.left) / b.width) * 2 - 1, (-(e.clientY - b.top) / b.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.ray.intersectsBox(mainBox) || raycaster.ray.intersectsBox(hallBox);
  }

  // ---------- Markers and cards ----------
  const svgNS = "http://www.w3.org/2000/svg";
  const stems = root.querySelector("[data-campus-stems]");
  const markers = [...root.querySelectorAll("[data-room]")].map((button) => {
    const id = button.dataset.room;
    const anchor = JSON.parse(button.dataset.anchor || "{}");
    const stem = document.createElementNS(svgNS, "line");
    stems?.append(stem);
    return {
      id,
      button,
      stem,
      card: root.querySelector(`[data-card="${id}"]`),
      outdoor: button.dataset.outdoor === "true",
      plan: anchor.plan,
      height: anchor.height ?? 4.1,
      scene: anchor.scene ? new THREE.Vector3(...anchor.scene) : null,
      x: 0,
      y: 0,
    };
  });
  const byId = new Map(markers.map((m) => [m.id, m]));
  let active = null;
  let pinnedCard = false;
  let closeTimer = 0;
  let transitioning = false;
  let restoringFocus = false;
  const mobileButtons = [...root.querySelectorAll('[data-mobile-room]')];
  const toggle = root.querySelector('[data-campus-toggle]');
  const syncExpanded = (m, expanded) => {
    m.button.setAttribute('aria-expanded', String(expanded));
    for (const button of mobileButtons) {
      if (button.dataset.mobileRoom === m.id) button.setAttribute('aria-expanded', String(expanded));
    }
  };
  const restoreFocus = (m) => {
    const button = phone.matches ? mobileButtons.find((button) => button.dataset.mobileRoom === m.id) : m.button;
    restoringFocus = true;
    button?.focus({ preventScroll: true });
    restoringFocus = false;
  };

  const cancelClose = () => clearTimeout(closeTimer);
  const scheduleClose = () => {
    cancelClose();
    if (!pinnedCard) closeTimer = window.setTimeout(close, 220);
  };

  function open(m, pin) {
    cancelClose();
    root.classList.add("is-explored");
    if (active === m) {
      pinnedCard = pinnedCard || pin;
      refreshDesired();
      return;
    }
    if (active?.card) active.card.hidden = true;
    active = m;
    pinnedCard = pin;
    for (const other of markers) syncExpanded(other, other === m);
    if (m.card) {
      m.card.hidden = false;
      positionCard();
    }
    highlights.select(m.id);
    refreshDesired();
  }

  function close() {
    cancelClose();
    if (active?.card) active.card.hidden = true;
    active = null;
    pinnedCard = false;
    for (const m of markers) syncExpanded(m, false);
    highlights.select(null);
    refreshDesired();
  }

  // As in the original desktop view: center the card on its marker and
  // prefer below, flipping above when needed. Mobile keeps its bottom sheet.
  function positionCard() {
    const card = active?.card;
    if (!card) return;
    if (phone.matches) {
      card.style.left = card.style.top = card.style.maxHeight = "";
      return;
    }
    const margin = 16;
    const gap = 30;
    const bounds = host.getBoundingClientRect();
    const top = Math.max(margin, 100 - bounds.top);
    const bottom = window.innerHeight - bounds.top - margin;
    card.style.maxHeight = `${Math.max(180, bottom - top)}px`;
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const x = Math.max(margin, Math.min(active.x - w / 2, host.clientWidth - w - margin));
    const below = active.y + gap;
    const above = active.y - gap - h;
    const preferred = below + h <= bottom ? below : above;
    card.style.left = `${x}px`;
    card.style.top = `${Math.max(top, Math.min(preferred, bottom - h))}px`;
  }

  const listeners = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    listeners.push(() => target.removeEventListener(type, fn, opts));
  };

  for (const m of markers) {
    on(m.button, "pointerenter", (e) => {
      if (e.pointerType !== "touch" && !transitioning && (!pinnedCard || active === m)) open(m, false);
    });
    on(m.button, "pointerleave", scheduleClose);
    // Keyboard focus previews the card; a tap or click opens it via "click" instead
    // (on phones the card is a bottom sheet that would otherwise catch the tap).
    let pressed = false;
    on(m.button, "pointerdown", () => (pressed = true));
    on(m.button, "focus", () => {
      if (!pressed && !restoringFocus) open(m, false);
      pressed = false;
    });
    on(m.button, "blur", (e) => {
      if (!m.card?.contains(e.relatedTarget)) scheduleClose();
    });
    on(m.button, "click", (e) => {
      e.stopPropagation();
      pressed = false;
      if (active === m && pinnedCard) close();
      else open(m, true);
    });
    if (m.card) {
      on(m.card, "pointerenter", cancelClose);
      on(m.card, "pointerleave", scheduleClose);
      on(m.card, "focusout", (e) => {
        if (!m.card.contains(e.relatedTarget) && e.relatedTarget !== m.button) scheduleClose();
      });
      const closeButton = m.card.querySelector("[data-card-close]");
      if (closeButton) on(closeButton, "click", () => { close(); restoreFocus(m); });
    }
  }
  on(document, "keydown", (e) => {
    if (e.key !== "Escape" || !active) return;
    const marker = active;
    close();
    restoreFocus(marker);
  });
  on(canvas, "pointerdown", () => {
    if (!phone.matches) close();
  });
  on(canvas, "click", () => {
    if (phone.matches) {
      const next = !desired;
      close();
      manualInside = next;
      refreshDesired();
    }
  });
  for (const button of mobileButtons) {
    on(button, 'click', () => {
      const marker = byId.get(button.dataset.mobileRoom);
      if (!marker) return;
      if (active === marker && pinnedCard) close();
      else open(marker, true);
    });
  }
  if (toggle) on(toggle, 'click', () => {
    const next = !desired;
    close();
    manualInside = next;
    refreshDesired();
  });
  on(phone, 'change', () => {
    manualInside = false;
    hoverInside = false;
    pendingHover = null;
    clearTimeout(hoverTimer);
    pointerCamera.recenter();
    close();
    resize();
  });

  for (const b of modeButtons) {
    on(b, "click", () => {
      manualInside = b.dataset.campusMode === "interior";
      clearTimeout(hoverTimer);
      hoverInside = false;
      close();
      refreshDesired();
    });
  }

  const projected = new THREE.Vector3();
  const anchorPoint = new THREE.Vector3();
  const offsets = [
    [0, 0], [30, 0], [-30, 0], [0, 36], [0, -36], [36, 30], [-36, -30], [50, 0], [-50, 0],
  ];
  function placeMarkers() {
    const placed = [];
    const w = host.clientWidth;
    const h = host.clientHeight;
    for (const m of markers) {
      if (m.scene) anchorPoint.copy(m.scene);
      else anchorPoint.set(planX(m.plan[0]), THREE.MathUtils.lerp(m.height, 0.65, peek), planZ(m.plan[1]));
      projected.copy(anchorPoint).project(camera);
      const ax = (projected.x * 0.5 + 0.5) * w;
      const ay = (-projected.y * 0.5 + 0.5) * h;
      let dx = 0;
      let dy = 0;
      if (active === m) {
        // The open marker stays put so its card doesn't run away.
        dx = m.x - ax;
        dy = m.y - ay;
      } else {
        for (const [ox, oy] of offsets) {
          dx = ox;
          dy = oy;
          if (!placed.some((p) => Math.hypot(ax + dx - p.x, ay + dy - p.y) < 46)) break;
        }
      }
      m.x = ax + dx;
      m.y = ay + dy;
      const offscreen = projected.z > 1 || m.x < 22 || m.x > w - 22 || m.y < 22 || m.y > h - 22;
      m.button.hidden = offscreen;
      m.button.style.transform = `translate(${m.x}px, ${m.y}px)`;
      const showStem = !offscreen && (dx || dy);
      m.stem.style.display = showStem ? "" : "none";
      if (showStem) {
        m.stem.setAttribute("x1", String(ax));
        m.stem.setAttribute("y1", String(ay));
        m.stem.setAttribute("x2", String(m.x));
        m.stem.setAttribute("y2", String(m.y));
      }
      if (!offscreen) placed.push(m);
    }
  }

  // ---------- Pointer ----------
  function leaveScene() {
    pointerCamera.recenter();
    setHover(false);
    kick();
  }
  on(
    host,
    "pointermove",
    (e) => {
      if (phone.matches || e.pointerType === "touch") {
        pointerCamera.recenter();
        setHover(false);
        kick();
        return;
      }
      const ui = e.target.closest?.("[data-room],[data-card]");
      if (ui) {
        pointerCamera.hold();
        const m = byId.get(ui.dataset.room || ui.dataset.card);
        setHover(!(m?.outdoor ?? false));
        kick();
        return;
      }
      if (e.target !== canvas) {
        leaveScene();
        return;
      }
      pointerCamera.aimAt(e.clientX, e.clientY, hostBounds());
      setHover(pointerOverHouse(e));
      kick();
    },
    { passive: true },
  );
  on(host, "pointerleave", leaveScene);
  on(window, "blur", leaveScene);
  on(window, "scroll", () => (boundsStale = true), { passive: true });
  on(document, "visibilitychange", () => {
    if (document.hidden) leaveScene();
    else kick();
  });

  // ---------- Size ----------
  function fit() {
    const aspect = host.clientWidth / host.clientHeight;
    const span = Math.max(62, 92 / aspect);
    camera.left = (-span * aspect) / 2;
    camera.right = (span * aspect) / 2;
    camera.top = span / 2;
    camera.bottom = -span / 2;
    camera.updateProjectionMatrix();
  }
  function resize() {
    renderer.setSize(host.clientWidth, host.clientHeight);
    comic.resize(host.clientWidth, host.clientHeight);
    fit();
    boundsStale = true;
    const rect = root.getBoundingClientRect();
    inView = rect.bottom > 0 && rect.top < window.innerHeight;
    placeMarkers();
    positionCard();
    kick();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const viewObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) kick();
    else leaveScene();
  });
  viewObserver.observe(root);

  // ---------- Frame ----------
  function fade(index, alpha) {
    const data = fadeGroups[index];
    data.group.visible = alpha > 0.005;
    for (const [m, base] of data.materials) {
      m.opacity = base.opacity * alpha;
      m.depthWrite = base.depthWrite && alpha > 0.99;
    }
    for (const { o, shadow } of data.meshes) o.castShadow = shadow && alpha > 0.9;
  }

  function frame(now) {
    raf = 0;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    const previous = peek;
    peek = reducedMotion
      ? desired ? 1 : 0
      : THREE.MathUtils.clamp(peek + ((desired ? 1 : -1) * dt) / (desired ? 0.24 : 0.3), 0, 1);
    // Walls finish rebuilding before the opaque roof comes back.
    const wall = THREE.MathUtils.smoothstep(peek, 0.3, 1);
    fade(0, 1 - wall);
    fade(1, wall);
    building.roof.visible = peek < 0.28;
    building.roof.position.y = 1.3 * (1 - Math.pow(1 - THREE.MathUtils.clamp(peek / 0.28, 0, 1), 3));
    if (peek !== previous) renderer.shadowMap.needsUpdate = true;
    transitioning = peek > 0.001 && peek < 0.999;

    const moving = pointerCamera.update(dt);
    landscape.updateCamera(camera);
    const fading = highlights.update(peek, dt);
    comic.render();
    placeMarkers();

    if (moving || fading || peek !== (desired ? 1 : 0)) raf = requestAnimationFrame(frame);
    else last = 0;
  }

  // Warm up the interior shaders so the first hover doesn't stutter.
  building.inside.visible = true;
  renderer.compile(scene, camera);
  building.inside.visible = false;
  resize();
  refreshDesired();
  root.dataset.state = "ready";

  return {
    destroy() {
      cancelAnimationFrame(raf);
      clearTimeout(hoverTimer);
      cancelClose();
      resizeObserver.disconnect();
      viewObserver.disconnect();
      for (const off of listeners) off();
      scene.traverse((o) => {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of mats) {
          m.map?.dispose();
          m.gradientMap?.dispose();
          m.dispose();
        }
      });
      comic.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      stems?.replaceChildren();
      delete root.dataset.state;
    },
  };
}
