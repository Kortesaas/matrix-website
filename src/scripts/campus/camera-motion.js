// Die MatriX 3D diorama — bounded pointer camera
// Ported from the supplied interactive 3D demo; keep in sync with its behaviour.
import * as THREE from "three";

// A fixed composition with a little pointer parallax, never a user-controlled orbit.
export function createPointerCamera(camera, { enabled = true } = {}) {
  const center = new THREE.Vector3(-6, 0, 0),
    baseTheta = 0.72,
    basePhi = 1,
    radius = 110;
  const target = new THREE.Vector2(),
    offset = new THREE.Vector2();
  function update(dt = 0) {
    offset.x = THREE.MathUtils.damp(offset.x, target.x, 7, dt);
    offset.y = THREE.MathUtils.damp(offset.y, target.y, 7, dt);
    if (Math.abs(offset.x) < 0.00001 && target.x === 0) offset.x = 0;
    if (Math.abs(offset.y) < 0.00001 && target.y === 0) offset.y = 0;
    camera.position
      .setFromSpherical(
        new THREE.Spherical(
          radius,
          basePhi + offset.y * 0.018,
          baseTheta + offset.x * 0.025,
        ),
      )
      .add(center);
    camera.lookAt(center);
    // Still easing towards the pointer target?
    return Math.abs(offset.x - target.x) > 0.0005 || Math.abs(offset.y - target.y) > 0.0005;
  }
  update();
  return {
    aimAt(x, y, bounds) {
      if (!enabled) return;
      target.set(
        THREE.MathUtils.clamp(
          ((x - bounds.left) / bounds.width) * 2 - 1,
          -1,
          1,
        ),
        THREE.MathUtils.clamp(
          ((y - bounds.top) / bounds.height) * 2 - 1,
          -1,
          1,
        ),
      );
    },
    hold() {
      target.copy(offset);
    },
    recenter() {
      target.set(0, 0);
    },
    update,
  };
}
