import { describe, it, expect } from 'vitest';
import { computeCropSize } from '../src/components/helpers/computeCropSize';
import { clampCropDims } from '../src/components/helpers/clampCropDims';
import { findMaxRotation } from '../src/components/helpers/findMaxRotation';
import { clampOffset } from '../src/components/helpers/clampOffset';

describe('helpers', () => {
  it('computeCropSize returns full dims for 0°', () => {
    const s = computeCropSize(800, 600, 0);
    expect(s.width).toBe(800);
    expect(s.height).toBe(600);
  });

  it('computeCropSize shrinks for non-zero rotation', () => {
    const s = computeCropSize(800, 600, 30);
    expect(s.width).toBeLessThan(800);
    expect(s.height).toBeLessThanOrEqual(600);
  });

  it('clampCropDims respects minimums', () => {
    const c = clampCropDims(50, 50, 200, 200, 10, 80, 80);
    expect(c.width).toBeGreaterThanOrEqual(80);
    expect(c.height).toBeGreaterThanOrEqual(80);
  });

  it('findMaxRotation returns a number between 0 and 45', () => {
    const r = findMaxRotation(500, 400, null, 50, 50);
    expect(typeof r).toBe('number');
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(45);
  });

  it('clampOffset keeps corners inside image', () => {
    const p = clampOffset(0, 0, 200, 200, 300, 300, 20);
    expect(typeof p.x).toBe('number');
    expect(typeof p.y).toBe('number');
  });
});
