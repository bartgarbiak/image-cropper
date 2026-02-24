import type { Size } from '../ImageCropper.types';

export function clampCropDims(
  cropW: number,
  cropH: number,
  imgW: number,
  imgH: number,
  rotationDeg: number,
  minW: number,
  minH: number,
): Size {
  const theta = Math.abs(rotationDeg) * (Math.PI / 180);
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const hiW = imgW / 2;
  const hiH = imgH / 2;
  const mhw = minW / 2;
  const mhh = minH / 2;

  let hw = Math.max(cropW / 2, mhw);
  let hh = Math.max(cropH / 2, mhh);

  if (theta < 1e-9) {
    hw = Math.min(hw, hiW);
    hh = Math.min(hh, hiH);
  } else {
    let maxHW = Infinity;
    if (cosT > 1e-9) maxHW = Math.min(maxHW, (hiW - hh * sinT) / cosT);
    if (sinT > 1e-9) maxHW = Math.min(maxHW, (hiH - hh * cosT) / sinT);

    if (maxHW < mhw) {
      let maxHH2 = Infinity;
      if (sinT > 1e-9) maxHH2 = Math.min(maxHH2, (hiW - mhw * cosT) / sinT);
      if (cosT > 1e-9) maxHH2 = Math.min(maxHH2, (hiH - mhw * sinT) / cosT);
      hh = Math.max(Math.min(hh, maxHH2), mhh);
      hw = mhw;
    } else {
      hw = Math.min(hw, maxHW);
    }

    let maxHH = Infinity;
    if (sinT > 1e-9) maxHH = Math.min(maxHH, (hiW - hw * cosT) / sinT);
    if (cosT > 1e-9) maxHH = Math.min(maxHH, (hiH - hw * sinT) / cosT);
    hh = Math.max(Math.min(hh, maxHH), mhh);
  }

  return { width: hw * 2, height: hh * 2 };
}
