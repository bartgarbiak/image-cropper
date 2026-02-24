import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ImageCropper } from '../dist/index.mjs';

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
});
