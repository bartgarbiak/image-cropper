import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

/* ───────────────────────── Types ────────────────────────────────── */

type CornerPos = 'tl' | 'tr' | 'bl' | 'br';

type DragMode =
  | { kind: 'corner'; corner: CornerPos }
  | { kind: 'move'; startX: number; startY: number; startOffset: Point };

interface Props {
  minCropWidth?: number;
  minCropHeight?: number;
}

interface Size {
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

/* ───────────────────────── Styled Components ───────────────────── */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 16px;
  gap: 16px;
`;

const Workspace = styled.div`
  position: relative;
  width: 100%;
  max-width: 900px;
  height: 65vh;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ImageElement = styled.img<{ $rotation: number }>`
  display: block;
  max-width: 70%;
  max-height: 70%;
  transform: rotate(${(p) => p.$rotation}deg);
  user-select: none;
  -webkit-user-drag: none;
`;

const CropOverlay = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  border: 2px solid black;
  pointer-events: none;
  z-index: 2;
`;

const CropMoveHandle = styled.div`
  position: absolute;
  inset: 0;
  cursor: move;
  pointer-events: auto;
  z-index: 2;
`;

const CornerMarker = styled.div<{ $pos: CornerPos }>`
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid black;
  background: transparent;
  pointer-events: auto;
  z-index: 3;

  ${(p) => (p.$pos === 'tl' ? 'top:-6px;left:-6px;cursor:nw-resize;' : '')}
  ${(p) => (p.$pos === 'tr' ? 'top:-6px;right:-6px;cursor:ne-resize;' : '')}
  ${(p) => (p.$pos === 'bl' ? 'bottom:-6px;left:-6px;cursor:sw-resize;' : '')}
  ${(p) => (p.$pos === 'br' ? 'bottom:-6px;right:-6px;cursor:se-resize;' : '')}
`;

const Controls = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 500px;
  padding: 12px 16px;
`;

const ControlLabel = styled.div`
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1.2px;
`;

const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
`;

const RangeLabel = styled.span`
  font-size: 0.8rem;
  min-width: 36px;
  text-align: center;
`;

const Slider = styled.input.attrs({ type: 'range' })`
  flex: 1;
`;

const AngleDisplay = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
`;

const ResetButton = styled.button`
  padding: 6px 12px;
  cursor: pointer;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  font-size: 0.95rem;
`;

/* ───────────────────────── Geometry helpers ─────────────────────── */

/**
 * Largest axis-aligned rectangle with aspect ratio W/H that fits
 * entirely inside the image rotated by rotationDeg (centred).
 */
function computeCropSize(W: number, H: number, rotationDeg: number): Size {
  if (W === 0 || H === 0) return { width: 0, height: 0 };
  const theta = Math.abs(rotationDeg) * (Math.PI / 180);
  if (theta < 1e-9) return { width: W, height: H };
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const s = Math.min(W / (W * cosT + H * sinT), H / (W * sinT + H * cosT));
  return { width: s * W, height: s * H };
}

/**
 * Clamp crop dimensions so that a centred crop of that size fits
 * inside the rotated image.
 */
function clampCropDims(
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

/**
 * Binary-search for the maximum |θ| (up to 45°) where the effective
 * crop still meets min-dimension constraints.
 */
function findMaxRotation(
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

/**
 * Clamp the crop offset so every corner of the axis-aligned crop
 * rectangle stays inside the rotated image.
 *
 * A point (px, py) in screen-space is inside the rotated image iff
 *   |px·cos θ + py·sin θ| ≤ imgW/2
 *   |−px·sin θ + py·cos θ| ≤ imgH/2
 *
 * We check all four corners and iteratively push the offset inward.
 */
function clampOffset(
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

/* ───────────────────────── Component ────────────────────────────── */

export default function ImageCropper({
  minCropWidth = 250,
  minCropHeight = 250,
}: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [displaySize, setDisplaySize] = useState<Size>({ width: 0, height: 0 });
  const [cropSize, setCropSize] = useState<Size | null>(null);
  const [cropOffset, setCropOffset] = useState<Point>({ x: 0, y: 0 });
  const [drag, setDrag] = useState<DragMode | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  /* ── Upload ── */
  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setImageSrc(URL.createObjectURL(file));
      setRotation(0);
      setCropSize(null);
      setCropOffset({ x: 0, y: 0 });
    },
    [imageSrc],
  );

  /* ── Track rendered image size ── */
  const syncDisplaySize = useCallback(() => {
    if (!imgRef.current) return;
    const w = imgRef.current.offsetWidth;
    const h = imgRef.current.offsetHeight;
    setDisplaySize((prev) =>
      prev.width === w && prev.height === h ? prev : { width: w, height: h },
    );
  }, []);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(syncDisplaySize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imageSrc, syncDisplaySize]);

  /* ── Effective crop dimensions (needed by drag handlers) ── */
  const effectiveCrop = useMemo<Size>(() => {
    if (cropSize)
      return clampCropDims(
        cropSize.width, cropSize.height,
        displaySize.width, displaySize.height,
        rotation, minCropWidth, minCropHeight,
      );
    return computeCropSize(displaySize.width, displaySize.height, rotation);
  }, [cropSize, displaySize, rotation, minCropWidth, minCropHeight]);

  /* ── Start corner resize ── */
  const handleCornerMouseDown = useCallback(
    (corner: CornerPos, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDrag({ kind: 'corner', corner });
    },
    [],
  );

  /* ── Start move ── */
  const handleMoveMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDrag({
        kind: 'move',
        startX: e.clientX,
        startY: e.clientY,
        startOffset: { ...cropOffset },
      });
    },
    [cropOffset],
  );

  /* ── Drag effect (resize + move) ── */
  useEffect(() => {
    if (!drag) return;

    const cursor =
      drag.kind === 'move'
        ? 'move'
        : ({ tl: 'nw-resize', tr: 'ne-resize', bl: 'sw-resize', br: 'se-resize' } as const)[
            drag.corner
          ];

    document.body.style.cursor = cursor;
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const ws = workspaceRef.current;
      if (!ws) return;

      if (drag.kind === 'move') {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        const rawX = drag.startOffset.x + dx;
        const rawY = drag.startOffset.y + dy;
        setCropOffset(
          clampOffset(
            rawX, rawY,
            effectiveCrop.width, effectiveCrop.height,
            displaySize.width, displaySize.height,
            rotation,
          ),
        );
        return;
      }

      /* Corner resize — resets offset to keep things simple */
      const rect = ws.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      let mx = e.clientX - cx;
      let my = e.clientY - cy;

      const { corner } = drag;
      if (corner === 'tl' || corner === 'bl') mx = -mx;
      if (corner === 'tl' || corner === 'tr') my = -my;

      const desiredW = Math.max(mx * 2, 20);
      const desiredH = Math.max(my * 2, 20);

      setCropSize(
        clampCropDims(
          desiredW, desiredH,
          displaySize.width, displaySize.height,
          rotation, minCropWidth, minCropHeight,
        ),
      );
      setCropOffset({ x: 0, y: 0 });
    };

    const handleMouseUp = () => setDrag(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [drag, displaySize, rotation, effectiveCrop, minCropWidth, minCropHeight]);

  /* ── Max rotation ── */
  const maxRotation = useMemo(
    () =>
      displaySize.width > 0 && displaySize.height > 0
        ? findMaxRotation(displaySize.width, displaySize.height, cropSize, minCropWidth, minCropHeight)
        : 45,
    [displaySize, cropSize, minCropWidth, minCropHeight],
  );

  useEffect(() => {
    setRotation((prev) => Math.max(-maxRotation, Math.min(maxRotation, prev)));
  }, [maxRotation]);

  /* ── Clamped offset ── */
  const effectiveOffset = useMemo<Point>(
    () =>
      clampOffset(
        cropOffset.x, cropOffset.y,
        effectiveCrop.width, effectiveCrop.height,
        displaySize.width, displaySize.height,
        rotation,
      ),
    [cropOffset, effectiveCrop, displaySize, rotation],
  );

  /* ── Resets ── */
  const resetCrop = useCallback(() => {
    setCropSize(null);
    setCropOffset({ x: 0, y: 0 });
  }, []);

  const handleRotationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newRot = parseFloat(e.target.value);
      setRotation(newRot);
    },
    [],
  );

  /* ── Render ── */
  return (
    <Container>
      <input type="file" accept="image/*" onChange={handleUpload} />

      <Workspace ref={workspaceRef}>
        {imageSrc ? (
          <>
            <ImageElement
              ref={imgRef}
              src={imageSrc}
              $rotation={rotation}
              onLoad={syncDisplaySize}
              alt="preview"
            />

            {displaySize.width > 0 && (
              <CropOverlay
                style={{
                  width: effectiveCrop.width,
                  height: effectiveCrop.height,
                  transform: `translate(calc(-50% + ${effectiveOffset.x}px), calc(-50% + ${effectiveOffset.y}px))`,
                }}
              >
                <CropMoveHandle onMouseDown={handleMoveMouseDown} />
                <CornerMarker $pos="tl" onMouseDown={(e) => handleCornerMouseDown('tl', e)} />
                <CornerMarker $pos="tr" onMouseDown={(e) => handleCornerMouseDown('tr', e)} />
                <CornerMarker $pos="bl" onMouseDown={(e) => handleCornerMouseDown('bl', e)} />
                <CornerMarker $pos="br" onMouseDown={(e) => handleCornerMouseDown('br', e)} />
              </CropOverlay>
            )}
          </>
        ) : (
          <EmptyState>
            <span>Open an image to get started</span>
          </EmptyState>
        )}
      </Workspace>

      {imageSrc && (
        <Controls>
          <ControlLabel>Rotation</ControlLabel>
          <SliderRow>
            <RangeLabel>-{maxRotation}°</RangeLabel>
            <Slider
              min={-maxRotation}
              max={maxRotation}
              step={0.1}
              value={Math.max(-maxRotation, Math.min(maxRotation, rotation))}
              onChange={handleRotationChange}
            />
            <RangeLabel>{maxRotation}°</RangeLabel>
          </SliderRow>
          <AngleDisplay>{rotation.toFixed(1)}°</AngleDisplay>
          <ButtonRow>
            {rotation !== 0 && (
              <ResetButton
                onClick={() => {
                  setRotation(0);
                  setCropSize(null);
                  setCropOffset({ x: 0, y: 0 });
                }}
              >
                Reset Rotation
              </ResetButton>
            )}
            {(cropSize || cropOffset.x !== 0 || cropOffset.y !== 0) && (
              <ResetButton onClick={resetCrop}>Reset Crop</ResetButton>
            )}
          </ButtonRow>
        </Controls>
      )}
    </Container>
  );
}
