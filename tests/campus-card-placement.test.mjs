import test from 'node:test';
import assert from 'node:assert/strict';
import { placeRoomCard } from '../src/scripts/campus/card-placement.js';

const viewport = { width: 280, height: 320, left: 16, right: 1264, top: 100, bottom: 784 };

function check(area) {
  const card = placeRoomCard(area);
  assert.ok(card.left >= area.left);
  assert.ok(card.left + area.width <= area.right);
  assert.ok(card.top >= area.top);
  assert.ok(card.top + card.maxHeight <= area.bottom);
  assert.ok(card.maxHeight > 0);
  const horizontalGap = Math.max(card.left - area.x, area.x - card.left - area.width);
  const verticalGap = Math.max(card.top - area.y, area.y - card.top - card.maxHeight);
  assert.ok(Math.max(horizontalGap, verticalGap) >= 44, 'card must stay clear of the pointer');
  return card;
}

test('prefer below the pointer even when a full card needs internal scrolling', () => {
  const card = check({ ...viewport, x: 640, y: 550 });
  assert.equal(card.top, 594);
  assert.equal(card.maxHeight, 190);
});

test('keep below-pointer cards within either horizontal edge', () => {
  for (const x of [24, 1240]) {
    const card = check({ ...viewport, x, y: 280 });
    assert.equal(card.top, 324);
  }
});

test('compact previews stay below a low pointer when their full height fits', () => {
  const card = check({ ...viewport, width: 300, height: 112, x: 640, y: 620 });
  assert.equal(card.top, 664);
  assert.equal(card.maxHeight, 112);
});

test('use the right side near the bottom of the viewport', () => {
  const card = check({ ...viewport, x: 200, y: 710 });
  assert.equal(card.left, 244);
});

test('use the left side when there is no space on the right', () => {
  const card = check({ ...viewport, x: 1150, y: 710 });
  assert.equal(card.left + viewport.width, 1106);
});

test('use space above as a last resort on narrow screens', () => {
  const card = check({ ...viewport, right: 624, x: 320, y: 710 });
  assert.equal(card.top + card.maxHeight, 666);
});

test('short viewports keep a gap and fit a scrollable card', () => {
  check({ ...viewport, right: 624, bottom: 300, x: 320, y: 210 });
});

test('keep cards below the header when their marker has scrolled above it', () => {
  const card = check({ ...viewport, x: 640, y: 20 });
  assert.equal(card.top, viewport.top);
});
