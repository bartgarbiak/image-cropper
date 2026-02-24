import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ImageCropper.css';
import type { CornerPos, DragMode, Size, Point, ImageCropperLabels, ImageCropperProps } from './ImageCropper.types';

/* ───────────────────────── Default labels ───────────────────────── */

const defaultLabels: Required<ImageCropperLabels> = {
  rotation: 'Rotation',
  rotate90: 'Rotate 90°',
  rotate180: 'Rotate 180°',
  resetRotation: 'Reset Rotation',
  resetCrop: 'Reset Crop',
  emptyState: 'Open an image to get started',
};

/* ───────────────────────── Geometry helpers ─────────────────────── */
/* helpers moved to ./helpers/*.ts */
import { computeCropSize } from './helpers/computeCropSize';
import { clampCropDims } from './helpers/clampCropDims';
import { findMaxRotation } from './helpers/findMaxRotation';
import { clampOffset } from './helpers/clampOffset';

/* ───────────────────────── Component ────────────────────────────── */

export function ImageCropper({
  minCropWidth = 250,
  minCropHeight = 250,
  labels: userLabels,
}: ImageCropperProps) {
  const labels = useMemo<Required<ImageCropperLabels>>(
    () => ({ ...defaultLabels, ...userLabels }),
    [userLabels],
  );

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [displaySize, setDisplaySize] = useState<Size>({ width: 0, height: 0 });
  const [cropSize, setCropSize] = useState<Size | null>(null);
  const [cropOffset, setCropOffset] = useState<Point>({ x: 0, y: 0 });
  const [drag, setDrag] = useState<DragMode | null>(null);
  const [baseRotation, setBaseRotation] = useState(0);

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
      setBaseRotation(0);
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

  /* ── Effective image dimensions (swap W/H for 90°/270° base rotation) ── */
  const effectiveDims = useMemo<Size>(() => {
    const swapped = baseRotation === 90 || baseRotation === 270;
    return swapped
      ? { width: displaySize.height, height: displaySize.width }
      : displaySize;
  }, [displaySize, baseRotation]);

  /* ── Effective crop dimensions (needed by drag handlers) ── */
  const effectiveCrop = useMemo<Size>(() => {
    if (cropSize)
      return clampCropDims(
        cropSize.width, cropSize.height,
        effectiveDims.width, effectiveDims.height,
        rotation, minCropWidth, minCropHeight,
      );
    return computeCropSize(effectiveDims.width, effectiveDims.height, rotation);
  }, [cropSize, effectiveDims, rotation, minCropWidth, minCropHeight]);

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
            effectiveDims.width, effectiveDims.height,
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
          effectiveDims.width, effectiveDims.height,
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
  }, [drag, effectiveDims, rotation, effectiveCrop, minCropWidth, minCropHeight]);

  /* ── Max rotation ── */
  const maxRotation = useMemo(
    () =>
      effectiveDims.width > 0 && effectiveDims.height > 0
        ? findMaxRotation(effectiveDims.width, effectiveDims.height, cropSize, minCropWidth, minCropHeight)
        : 45,
    [effectiveDims, cropSize, minCropWidth, minCropHeight],
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
        effectiveDims.width, effectiveDims.height,
        rotation,
      ),
    [cropOffset, effectiveCrop, effectiveDims, rotation],
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

  /* ── 90°/180° rotation ── */
  const can90 = useMemo(() => {
    const newBase = (baseRotation + 90) % 360;
    const swapped = newBase === 90 || newBase === 270;
    const w = swapped ? displaySize.height : displaySize.width;
    const h = swapped ? displaySize.width : displaySize.height;
    return w >= minCropWidth && h >= minCropHeight;
  }, [displaySize, baseRotation, minCropWidth, minCropHeight]);

  const handleRotate90 = useCallback(() => {
    setBaseRotation((prev) => (prev + 90) % 360);
    setRotation(0);
    setCropSize(null);
    setCropOffset({ x: 0, y: 0 });
  }, []);

  const handleRotate180 = useCallback(() => {
    setBaseRotation((prev) => (prev + 180) % 360);
    setRotation(0);
    setCropSize(null);
    setCropOffset({ x: 0, y: 0 });
  }, []);

  /* ── Render ── */
  return (
    <div className="cropper-container">
      <input type="file" accept="image/*" onChange={handleUpload} />

      <div className="cropper-workspace" ref={workspaceRef}>
        {imageSrc ? (
          <>
            <img
              className="cropper-image"
              ref={imgRef}
              src={imageSrc}
              style={{ transform: `rotate(${baseRotation + rotation}deg)` }}
              onLoad={syncDisplaySize}
              alt="preview"
            />

            {displaySize.width > 0 && (
              <div
                className="cropper-overlay"
                style={{
                  width: effectiveCrop.width,
                  height: effectiveCrop.height,
                  transform: `translate(calc(-50% + ${effectiveOffset.x}px), calc(-50% + ${effectiveOffset.y}px))`,
                }}
              >
                <div className="cropper-move-handle" onMouseDown={handleMoveMouseDown} />
                <div className="cropper-corner cropper-corner--tl" onMouseDown={(e) => handleCornerMouseDown('tl', e)} />
                <div className="cropper-corner cropper-corner--tr" onMouseDown={(e) => handleCornerMouseDown('tr', e)} />
                <div className="cropper-corner cropper-corner--bl" onMouseDown={(e) => handleCornerMouseDown('bl', e)} />
                <div className="cropper-corner cropper-corner--br" onMouseDown={(e) => handleCornerMouseDown('br', e)} />
              </div>
            )}
          </>
        ) : (
          <div className="cropper-empty">
            <span>{labels.emptyState}</span>
          </div>
        )}
      </div>

      {imageSrc && (
        <div className="cropper-controls">
          <div className="cropper-label">{labels.rotation}</div>
          <div className="cropper-slider-row">
            <span className="cropper-range-label">-{maxRotation}°</span>
            <input
              className="cropper-slider"
              type="range"
              min={-maxRotation}
              max={maxRotation}
              step={0.1}
              value={Math.max(-maxRotation, Math.min(maxRotation, rotation))}
              onChange={handleRotationChange}
            />
            <span className="cropper-range-label">{maxRotation}°</span>
          </div>
          <div className="cropper-angle">{rotation.toFixed(1)}°</div>
          <div className="cropper-button-row">
            <button className="cropper-button" onClick={handleRotate90} disabled={!can90}>
              {labels.rotate90}
            </button>
            <button className="cropper-button" onClick={handleRotate180}>
              {labels.rotate180}
            </button>
          </div>
          <div className="cropper-button-row">
            {(rotation !== 0 || baseRotation !== 0) && (
              <button
                className="cropper-button"
                onClick={() => {
                  setRotation(0);
                  setBaseRotation(0);
                  setCropSize(null);
                  setCropOffset({ x: 0, y: 0 });
                }}
              >
                {labels.resetRotation}
              </button>
            )}
            {(cropSize || cropOffset.x !== 0 || cropOffset.y !== 0) && (
              <button className="cropper-button" onClick={resetCrop}>{labels.resetCrop}</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
