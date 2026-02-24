import React, { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import './ImageCropper.css';
import type { CornerPos, DragMode, Size, Point, ImageCropperLabels, ImageCropperProps, CropData, RotationData, ChangeData, CropperState, ImageCropperRef } from './ImageCropper.types';
import { useHistory } from '../utils/useHistory';

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

export const ImageCropper = forwardRef<ImageCropperRef, ImageCropperProps>((
  {
    imageSrc: externalImageSrc,
    minCropWidth = 250,
    minCropHeight = 250,
    labels: userLabels,
    onCrop,
    onRotate,
    onChange,
    onHistoryChange,
  },
  ref,
) => {
  const labels = useMemo<Required<ImageCropperLabels>>(
    () => ({ ...defaultLabels, ...userLabels }),
    [userLabels],
  );

  const imageSrc = externalImageSrc;
  const [displaySize, setDisplaySize] = useState<Size>({ width: 0, height: 0 });
  const [drag, setDrag] = useState<DragMode | null>(null);

  const history = useHistory<CropperState>({
    rotation: 0,
    baseRotation: 0,
    cropSize: null,
    cropOffset: { x: 0, y: 0 },
  });

  const { rotation, baseRotation, cropSize, cropOffset } = history.state;

  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateState = useCallback(
    (updates: Partial<CropperState>) => {
      history.stage({ ...history.state, ...updates });
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
      commitTimerRef.current = setTimeout(() => {
        commitTimerRef.current = null;
        history.commit();
      }, 500);
    },
    [history],
  );

  // For discrete actions (buttons) — commit immediately, bypassing the debounce
  const commitNow = useCallback(
    (updates: Partial<CropperState>) => {
      if (commitTimerRef.current) { clearTimeout(commitTimerRef.current); commitTimerRef.current = null; }
      history.commit({ ...history.state, ...updates });
    },
    [history],
  );

  const imgRef = useRef<HTMLImageElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

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

  /* ── Reset when imageSrc changes ── */
  useEffect(() => {
    if (commitTimerRef.current) { clearTimeout(commitTimerRef.current); commitTimerRef.current = null; }
    history.reset({
      rotation: 0,
      baseRotation: 0,
      cropSize: null,
      cropOffset: { x: 0, y: 0 },
    });
  }, [imageSrc]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const newOffset = clampOffset(
          rawX, rawY,
          effectiveCrop.width, effectiveCrop.height,
          effectiveDims.width, effectiveDims.height,
          rotation,
        );
        updateState({ cropOffset: newOffset });
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

      const newCropSize = clampCropDims(
        desiredW, desiredH,
        effectiveDims.width, effectiveDims.height,
        rotation, minCropWidth, minCropHeight,
      );
      updateState({ cropSize: newCropSize, cropOffset: { x: 0, y: 0 } });
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
  }, [drag, effectiveDims, rotation, effectiveCrop, minCropWidth, minCropHeight, updateState]);

  /* ── Max rotation ── */
  const maxRotation = useMemo(
    () =>
      effectiveDims.width > 0 && effectiveDims.height > 0
        ? findMaxRotation(effectiveDims.width, effectiveDims.height, cropSize, minCropWidth, minCropHeight)
        : 45,
    [effectiveDims, cropSize, minCropWidth, minCropHeight],
  );

  useEffect(() => {
    const clamped = Math.max(-maxRotation, Math.min(maxRotation, rotation));
    if (clamped !== rotation) {
      updateState({ rotation: clamped });
    }
  }, [maxRotation, rotation, updateState]);

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

  /* ── Current crop data ── */
  const cropData = useMemo<CropData>(
    () => ({
      x: effectiveOffset.x - effectiveCrop.width / 2,
      y: effectiveOffset.y - effectiveCrop.height / 2,
      width: effectiveCrop.width,
      height: effectiveCrop.height,
    }),
    [effectiveOffset, effectiveCrop],
  );

  const rotationData = useMemo<RotationData>(
    () => ({ rotation, baseRotation }),
    [rotation, baseRotation],
  );

  /* ── Emit events on commit (debounced interactions, undo/redo, instant actions) ── */
  const prevCommittedRef = useRef<CropperState | null>(null);
  useEffect(() => {
    if (!imageSrc) return;
    const prev = prevCommittedRef.current;
    prevCommittedRef.current = history.committed;
    const rotChanged =
      !prev ||
      history.committed.rotation !== prev.rotation ||
      history.committed.baseRotation !== prev.baseRotation;
    onCrop?.(cropData);
    onRotate?.(rotationData);
    onChange?.({
      action: rotChanged ? 'rotate' : 'crop',
      crop: cropData,
      rotation: rotationData,
    });
  }, [history.committed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onHistoryChange?.(history.canUndo, history.canRedo);
  }, [history.canUndo, history.canRedo, onHistoryChange]);

  /* ── Expose ref API ── */
  useImperativeHandle(
    ref,
    () => ({
      undo: () => {
        if (commitTimerRef.current) { clearTimeout(commitTimerRef.current); commitTimerRef.current = null; }
        history.undo();
      },
      redo: () => {
        if (commitTimerRef.current) { clearTimeout(commitTimerRef.current); commitTimerRef.current = null; }
        history.redo();
      },
      canUndo: history.canUndo,
      canRedo: history.canRedo,
      getHistory: history.getHistory,
    }),
    [history],
  );

  /* ── Resets ── */
  const resetCrop = useCallback(() => {
    commitNow({ cropSize: null, cropOffset: { x: 0, y: 0 } });
  }, [commitNow]);

  const handleRotationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newRot = parseFloat(e.target.value);
      updateState({ rotation: newRot });
    },
    [updateState],
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
    commitNow({
      baseRotation: (baseRotation + 90) % 360,
      rotation: 0,
      cropSize: null,
      cropOffset: { x: 0, y: 0 },
    });
  }, [baseRotation, commitNow]);

  const handleRotate180 = useCallback(() => {
    commitNow({
      baseRotation: (baseRotation + 180) % 360,
      rotation: 0,
      cropSize: null,
      cropOffset: { x: 0, y: 0 },
    });
  }, [baseRotation, commitNow]);

  /* ── Render ── */
  return (
    <div className="cropper-container">
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
                  commitNow({
                    rotation: 0,
                    baseRotation: 0,
                    cropSize: null,
                    cropOffset: { x: 0, y: 0 },
                  });
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
});

ImageCropper.displayName = 'ImageCropper';
