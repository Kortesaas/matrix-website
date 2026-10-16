import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { campusPlanRooms, campusPartitions, planX, planZ } from '../src/data/campus-plan.js';
import { createRoomHighlights } from '../src/scripts/campus/highlights.js';
import { comicRenderSettings } from '../src/scripts/campus/comic.js';

function contains(polygon, [x, y]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

test('each public room marker sits within its own floor-plan polygon', () => {
  for (const [id, room] of Object.entries(campusPlanRooms)) {
    assert.ok(contains(room.outline, room.anchor.plan), id);
  }
});

test('the east wing follows the labeled north-to-south order', () => {
  const { gruppenraum, werkstatt, maedchenzimmer } = campusPlanRooms;
  assert.ok(gruppenraum.bounds[3] < werkstatt.bounds[1]);
  assert.ok(werkstatt.bounds[3] < maedchenzimmer.bounds[1]);
});

test('Tonstudio and Bandraum have independent adjacent areas and markers', () => {
  const { tonstudio, bandraum } = campusPlanRooms;
  assert.ok(tonstudio.bounds[2] < bandraum.bounds[0]);
  assert.ok(tonstudio.anchor.plan[0] < bandraum.anchor.plan[0]);
});

test('the counter marker is inside the counter enclosure rather than the foyer aisle', () => {
  assert.ok(contains(campusPlanRooms.theke.outline, [790, 950]));
  assert.ok(!contains(campusPlanRooms.theke.outline, [820, 1040]));
});

test('the L-shaped foyer highlight excludes service rooms, counter and courtyard', () => {
  const { outline } = campusPlanRooms.foyer;
  assert.ok(contains(outline, [360, 790]));
  assert.ok(contains(outline, [900, 1050]));
  for (const point of [[700, 800], [940, 865], [790, 950], [1140, 775]]) assert.ok(!contains(outline, point));
});

test('projected highlights match the floor polygons without mirroring the plan', () => {
  const highlights = createRoomHighlights();
  highlights.group.updateMatrixWorld(true);
  for (const [id, room] of Object.entries(campusPlanRooms)) {
    const mesh = highlights.group.getObjectByName(`Room highlight · ${id}`);
    const box = new THREE.Box3().setFromObject(mesh);
    const xs = room.outline.map(([x]) => planX(x));
    const zs = room.outline.map(([, y]) => planZ(y));
    assert.ok(Math.abs(box.min.x - Math.min(...xs)) < 0.0001, id);
    assert.ok(Math.abs(box.max.x - Math.max(...xs)) < 0.0001, id);
    assert.ok(Math.abs(box.min.z - Math.min(...zs)) < 0.0001, id);
    assert.ok(Math.abs(box.max.z - Math.max(...zs)) < 0.0001, id);
  }
});

test('the simplified partition set contains no duplicate wall segments', () => {
  const seen = new Set();
  for (const partition of campusPartitions) {
    for (const [x1, y1, x2, y2] of partition.segments) {
      const key = [[x1, y1].join(','), [x2, y2].join(',')].sort().join(':');
      assert.ok(!seen.has(key), `${partition.name}: ${key}`);
      seen.add(key);
    }
  }
});

test('the wall runs marked in red are continuous', () => {
  const segments = campusPartitions.flatMap(partition => partition.segments);
  for (const expected of [
    [175, 910, 175, 1105],
    [915, 535, 1255, 535],
    [1365, 135, 1365, 265],
    [1365, 340, 1840, 340],
    [1365, 990, 1365, 1105],
  ]) assert.ok(segments.some(segment => segment.every((value, i) => value === expected[i])), expected.join(','));
});

test('mobile contours stay thinner while retaining native phone resolution', () => {
  const desktop = comicRenderSettings(false, 3);
  const mobile = comicRenderSettings(true, 3);
  assert.ok(mobile.outlineWidth <= desktop.outlineWidth / 2);
  assert.ok(mobile.outlineOpacity < desktop.outlineOpacity);
  assert.equal(mobile.pixelRatio, 3);
  assert.equal(desktop.pixelRatio, 2);
  assert.equal(comicRenderSettings(true, 1).pixelRatio, 2, 'supersample the small phone map even on 1x displays');
});

test('the cutaway keeps walls low and the bar is furniture, with a simpler hall', async () => {
  // Only canvas textures need a DOM; this checks actual Three.js geometry
  // without requiring a GPU or making assumptions about screenshot colours.
  const previous = globalThis.document;
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }) };
  try {
    const { createModel } = await import('../src/scripts/campus/model.js');
    const model = createModel();
    assert.ok(model.inside.children.length < 70);
    for (const wall of model.inside.children) assert.ok(wall.geometry.parameters.height <= 0.7, wall.name);
    assert.ok(!model.inside.children.some(wall => /theke|counter|cubicle/i.test(wall.name)));
    assert.ok(model.furniture.getObjectByName('Theke front'));
    assert.ok(model.furniture.getObjectByName('Studio mixing desk'));
    assert.ok(model.furniture.getObjectByName('Bass drum'));
    assert.ok(!model.model.getObjectByName('Entrance canopy column'));
    assert.ok(!model.furniture.getObjectByName('Kitchen worktop'));
    assert.ok(!model.furniture.getObjectByName('WC washbasin'));
    assert.ok(!model.furniture.children.some(object => object.position.distanceTo(new THREE.Vector3(planX(530), 0, planZ(700))) < 0.001));
    const stage = new THREE.Box3().setFromObject(model.furniture.getObjectByName('Hall stage'));
    const step = new THREE.Box3().setFromObject(model.furniture.getObjectByName('Hall stage front step'));
    assert.ok(Math.abs(stage.min.x - planX(625)) < 0.0001);
    assert.ok(Math.abs(stage.max.x - planX(865)) < 0.0001);
    assert.ok(Math.abs(stage.min.z - planZ(100)) < 0.0001);
    assert.ok(Math.abs(stage.max.z - planZ(450)) < 0.0001);
    assert.ok(step.min.z >= stage.max.z - 0.0001, 'stage front faces +planY (lower left in the default view)');
    model.roof.updateMatrixWorld(true);
    const lowRoof = model.roof.getObjectByName('Low gravel roof');
    const ray = new THREE.Raycaster();
    for (const x of [1000, 1150, 1350]) {
      ray.set(new THREE.Vector3(planX(x), 10, planZ(65)), new THREE.Vector3(0, -1, 0));
      assert.ok(ray.intersectObject(lowRoof).length > 0, 'roof must bridge the rear recess');
    }
    ray.set(new THREE.Vector3(planX(1150), 10, planZ(775)), new THREE.Vector3(0, -1, 0));
    assert.equal(ray.intersectObject(lowRoof).length, 0, 'courtyard remains open');
    const hallChairs = model.furniture.children.filter(object => object.isGroup && object.getObjectByName('Chair seat') && object.position.x < planX(915) && object.position.z < planZ(535));
    assert.equal(hallChairs.length, 9);
    for (const chair of hallChairs) {
      assert.ok(chair.position.x > planX(250), 'keep seats away from the left perimeter');
      assert.ok(chair.position.z < planZ(400), 'keep seats away from the lower wall');
      assert.ok(chair.position.x < stage.min.x - 0.5, 'leave space beside the stage');
    }
    let furnitureMeshes = 0;
    model.furniture.traverse(object => { if (object.isMesh) furnitureMeshes++; });
    assert.ok(furnitureMeshes < 250, `${furnitureMeshes} furniture meshes`);
    for (const id of Object.keys(campusPlanRooms)) assert.ok(model.floors.children.some(floor => floor.userData.roomId === id));
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});
