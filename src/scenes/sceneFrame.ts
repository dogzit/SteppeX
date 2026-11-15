/**
 * The part of the window the scene still has to itself.
 *
 * Panels float over the canvas, so "centred in the window" and "centred in what the viewer can
 * actually see" are different places. Measuring the chrome lets the camera keep the Moon, and the
 * pin just dropped on it, inside the free area instead of behind a drawer.
 */
export interface SceneFrame { x: number; y: number; w: number; h: number }

/** Elements that sit above the scene and own their space. */
const CHROME = 'header.app-hud, .app-timeline, .phone-timebar, aside, .compare-panel, .welcome-hint';
const MIN_SIDE = 120; // never collapse the stage to nothing

export function measureSceneFrame(width: number, height: number): SceneFrame {
  let left = 0, right = width, top = 0, bottom = height;
  if (typeof document === 'undefined') return { x: 0, y: 0, w: width, h: height };
  for (const el of document.querySelectorAll<HTMLElement>(CHROME)) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    const spansWidth = r.width > width * 0.6;
    if (spansWidth) {
      // A full-width band can only take space from the top or the bottom.
      if (r.top <= height - r.bottom) top = Math.max(top, r.bottom);
      else bottom = Math.min(bottom, r.top);
    } else if (r.left + r.width / 2 > width / 2) right = Math.min(right, r.left);
    else left = Math.max(left, r.right);
  }
  if (right - left < MIN_SIDE) { left = 0; right = width; }
  if (bottom - top < MIN_SIDE) {
    // A drawer covering nearly everything: keep the tallest strip that is left.
    if (top > height - bottom) { bottom = top; top = 0; } else { top = bottom; bottom = height; }
    if (bottom - top < MIN_SIDE) { top = 0; bottom = height; }
  }
  return { x: left, y: top, w: right - left, h: bottom - top };
}
