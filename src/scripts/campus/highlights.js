// Die MatriX 3D diorama — selected-room highlight
import * as THREE from "three";
import { campusPlanRooms, planX, planZ } from '../../data/campus-plan.js';
export function createRoomHighlights(ink = "#241b36") {
  const group = new THREE.Group(),
    entries = new Map();
  for (const [id, room] of Object.entries(campusPlanRooms)) {
    const shape = new THREE.Shape(room.outline.map(([x, y]) => new THREE.Vector2(planX(x), -planZ(y))));
    const fill = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({
        color: "#9b65df",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    fill.rotation.x = -Math.PI / 2;
    fill.name = `Room highlight · ${id}`;
    fill.position.y = 0.06;
    fill.userData.noInk = true;
    const corners = room.outline.map(([x, y]) => new THREE.Vector3(planX(x), 0, planZ(y)));
    const edge = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(corners),
      new THREE.LineBasicMaterial({
        color: ink,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    edge.position.y = 0.07;
    group.add(fill, edge);
    entries.set(id, {
      fill,
      edge,
      amount: 0,
      roof: room.anchor.height + 0.03,
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
