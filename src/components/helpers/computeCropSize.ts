import type { Size } from '../ImageCropper.types';

export function computeCropSize(W: number, H: number, rotationDeg: number): Size {
  if (W === 0 || H === 0) return { width: 0, height: 0 };
  const theta = Math.abs(rotationDeg) * (Math.PI / 180);
  if (theta < 1e-9) return { width: W, height: H };
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const s = Math.min(W / (W * cosT + H * sinT), H / (W * sinT + H * cosT));
  return { width: s * W, height: s * H };
}
