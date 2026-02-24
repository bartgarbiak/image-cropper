import type { Point } from '../ImageCropper.types';

export function clampOffset(
  ox: number,
  oy: number,
  cropW: number,
  cropH: number,
  imgW: number,
  imgH: number,
  rotationDeg: number,
): Point {
  const theta = rotationDeg * (Math.PI / 180);
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const hiW = imgW / 2;
  const hiH = imgH / 2;
  const hw = cropW / 2;
  const hh = cropH / 2;

  const corners: [number, number][] = [
    [-hw, -hh],
    [hw, -hh],
    [-hw, hh],
    [hw, hh],
  ];

  let cx = ox;
  let cy = oy;

  for (let iter = 0; iter < 8; iter++) {
    let ok = true;
    for (const [dx, dy] of corners) {
      const px = cx + dx;
      const py = cy + dy;
      const u = px * cosT + py * sinT;
      const v = -px * sinT + py * cosT;

      if (Math.abs(u) > hiW + 0.5) {
        const excess = u > 0 ? u - hiW : u + hiW;
        cx -= excess * cosT;
        cy -= excess * sinT;
        ok = false;
      }
      if (Math.abs(v) > hiH + 0.5) {
        const excess = v > 0 ? v - hiH : v + hiH;
        cx += excess * sinT;
        cy -= excess * cosT;
        ok = false;
      }
    }
    if (ok) break;
  }

  return { x: cx, y: cy };
}
