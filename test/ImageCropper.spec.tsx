import React, { createRef } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { ImageCropper } from '../dist/index.mjs';
import type { ImageCropperRef } from '../dist/index.mjs';

describe('<ImageCropper />', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders empty state when no imageSrc', () => {
    render(<ImageCropper />);
    expect(screen.getByText('Open an image to get started')).toBeDefined();
  });

  it('renders empty state with null imageSrc', () => {
    render(<ImageCropper imageSrc={null} />);
    expect(screen.getByText('Open an image to get started')).toBeDefined();
  });

  it('accepts custom labels', () => {
    render(
      <ImageCropper
        imageSrc={null}
        labels={{
          emptyState: 'No image',
          rotation: 'Rot',
          rotate90: '90',
          rotate180: '180',
          resetRotation: 'Reset',
          resetCrop: 'ResetC',
        }}
      />,
    );
    expect(screen.getByText('No image')).toBeDefined();
  });

  it('accepts event callbacks without errors', () => {
    const onCrop = vi.fn();
    const onRotate = vi.fn();
    const onChange = vi.fn();

    render(
      <ImageCropper
        imageSrc={null}
        onCrop={onCrop}
        onRotate={onRotate}
        onChange={onChange}
      />,
    );
    expect(screen.getByText('Open an image to get started')).toBeDefined();
  });

  // ── Ref / undo-redo ──────────────────────────────────────────────

  it('exposes ref API with undo/redo/canUndo/canRedo/getHistory', () => {
    const ref = createRef<ImageCropperRef>();
    render(<ImageCropper imageSrc={null} ref={ref} />);

    expect(typeof ref.current?.undo).toBe('function');
    expect(typeof ref.current?.redo).toBe('function');
    expect(typeof ref.current?.getHistory).toBe('function');
    expect(ref.current?.canUndo).toBe(false);
    expect(ref.current?.canRedo).toBe(false);
  });

  it('getHistory returns empty past/future initially', () => {
    const ref = createRef<ImageCropperRef>();
    render(<ImageCropper imageSrc={null} ref={ref} />);

    const h = ref.current?.getHistory();
    expect(h?.past).toHaveLength(0);
    expect(h?.future).toHaveLength(0);
  });

  it('calling undo/redo on empty history does not throw', () => {
    const ref = createRef<ImageCropperRef>();
    render(<ImageCropper imageSrc={null} ref={ref} />);

    expect(() => {
      act(() => ref.current?.undo());
      act(() => ref.current?.redo());
    }).not.toThrow();
  });

  // ── onHistoryChange ──────────────────────────────────────────────

  it('calls onHistoryChange(false, false) on initial mount', () => {
    const onHistoryChange = vi.fn();
    render(<ImageCropper imageSrc={null} onHistoryChange={onHistoryChange} />);
    // First call should signal no undo, no redo
    expect(onHistoryChange).toHaveBeenCalledWith(false, false);
  });
});
