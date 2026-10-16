// Die MatriX 3D diorama — selected-room highlight
// Ported from the supplied interactive 3D demo; keep in sync with its behaviour.
import * as THREE from "three";
const bounds = {
  saal: [90, 65, 912, 492],
  treffpunkt: [175, 535, 607, 910],
  bar: [530, 910, 1040, 1105],
  werkstatt: [1475, 540, 1835, 718],
  chillout: [1475, 730, 1835, 908],
  medien: [1475, 347, 1835, 530],
  musik: [1380, 45, 1950, 255],
};
export function createRoomHighlights(ink = "#241b36") {
  const group = new THREE.Group(),
    entries = new Map();
  for (const [id, b] of Object.entries(bounds)) {
    const [x, y, xx, yy] = b,
      w = (xx - x) / 42,
      d = (yy - y) / 42,
      cx = ((x + xx) / 2 - 1005) / 42,
      cz = ((y + yy) / 2 - 620) / 42;
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({
        color: "#9b65df",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    fill.rotation.x = -Math.PI / 2;
    fill.position.set(cx, 0.06, cz);
    fill.userData.noInk = true;
    const corners = [
      [-w / 2, 0, -d / 2],
      [w / 2, 0, -d / 2],
      [w / 2, 0, d / 2],
      [-w / 2, 0, d / 2],
    ].map((p) => new THREE.Vector3(...p));
    const edge = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(corners),
      new THREE.LineBasicMaterial({
        color: ink,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    edge.position.set(cx, 0.07, cz);
    group.add(fill, edge);
    entries.set(id, {
      fill,
      edge,
      amount: 0,
      roof: id === "saal" ? 6.13 : 4.12,
    });
  }
  let active = null;
  return {
    group,
    select(id) {
      active = id;
    },
    setPalette(p) {
      for (const e of entries.values())
        e.fill.material.color.copy(p.color(0.7, 0.57));
    },
    update(peek, dt) {
      let animating = false;
      for (const [id, e] of entries) {
        const goal = id === active ? 1 : 0;
        e.amount = THREE.MathUtils.damp(e.amount, goal, 14, dt);
        if (Math.abs(e.amount - goal) > 0.002) animating = true;
        else e.amount = goal;
        e.fill.material.opacity = e.amount * 0.19;
        e.edge.material.opacity = e.amount * 0.55;
        const y = THREE.MathUtils.lerp(e.roof, 0.06, peek);
        e.fill.position.y = y;
        e.edge.position.y = y + 0.01;
        e.fill.visible = e.edge.visible = e.amount > 0.01;
      }
      return animating;
    },
  };
}
