/**
 * Keep a room card clear of its pointer/marker, preferring the space below.
 * All coordinates are in the viewport. A short viewport can use a side or,
 * as a last resort, the space above, without putting the card under the pointer.
 * @param {{ x: number, y: number, width: number, height: number, left: number, right: number, top: number, bottom: number }} area
 */
export function placeRoomCard({ x, y, width, height, left, right, top, bottom }) {
  const gap = 44;
  const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));
  const centered = clamp(x - width / 2, left, right - width);
  const belowTop = Math.max(top, y + gap);
  const below = bottom - belowTop;
  const above = y - gap - top;
  const minimum = Math.min(height, 180);

  if (below >= minimum) {
    return { left: centered, top: belowTop, maxHeight: Math.min(height, below) };
  }
  if (right - x - gap >= width || x - gap - left >= width) {
    return {
      left: right - x - gap >= width ? x + gap : x - gap - width,
      top: clamp(y - height / 2, top, bottom - height),
      maxHeight: Math.min(height, bottom - top),
    };
  }
  if (above >= minimum) {
    const maxHeight = Math.min(height, above);
    return { left: centered, top: y - gap - maxHeight, maxHeight };
  }
  // Very short screens: use whichever vertical side has more room.
  const maxHeight = Math.max(1, Math.min(height, Math.max(below, above)));
  return { left: centered, top: below >= above ? y + gap : y - gap - maxHeight, maxHeight };
}
