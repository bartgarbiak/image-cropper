import type { Size } from '../ImageCropper.types';
import { clampCropDims } from './clampCropDims';
import { computeCropSize } from './computeCropSize';

export function findMaxRotation(
  imgW: number,
  imgH: number,
  customCrop: Size | null,
  minW: number,
  minH: number,
): number {
  let lo = 0;
  let hi = 45;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const c = customCrop
      ? clampCropDims(customCrop.width, customCrop.height, imgW, imgH, mid, minW, minH)
      : computeCropSize(imgW, imgH, mid);
    if (c.width >= minW && c.height >= minH) lo = mid;
    else hi = mid;
  }
  return Math.round(lo * 10) / 10;
}
