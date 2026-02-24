import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImageCropper } from '../dist/index.mjs';

describe('<ImageCropper />', () => {
  it('renders empty state', () => {
    render(<ImageCropper />);
    expect(screen.getByText('Open an image to get started')).toBeDefined();
  });

  it('accepts custom labels', () => {
    render(
      <ImageCropper
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
});
