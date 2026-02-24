# ImageCropper — Documentation

A React component for interactive image rotation and cropping. Built with TypeScript, React 18, pure CSS, and Vite.

---

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview production build
```

Requires **Node ≥ 18**.

---

## Project Structure

```
cropper/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vite.config.js
├── README.md                        # ← you are here
├── demo/                            # Demo app
│   ├── index.html
│   ├── main.tsx
│   └── App.tsx
└── src/
    ├── index.ts                     # Barrel exports
    └── components/
        ├── ImageCropper.tsx          # Core component (all logic)
        ├── ImageCropper.types.ts     # Type definitions
        └── ImageCropper.css          # Component styles
```

---

## `<ImageCropper>` Component

### Props

| Prop            | Type                  | Default            | Description                                     |
| --------------- | --------------------- | ------------------ | ----------------------------------------------- |
| `minCropWidth`  | `number`              | `250`              | Minimum crop rectangle width in pixels.          |
| `minCropHeight` | `number`              | `250`              | Minimum crop rectangle height in pixels.         |
| `labels`        | `ImageCropperLabels`  | See below          | Override any UI label string.                    |

#### `ImageCropperLabels`

All fields are optional. Any omitted key falls back to the English default.

| Key              | Type     | Default                            |
| ---------------- | -------- | ---------------------------------- |
| `rotation`       | `string` | `"Rotation"`                       |
| `rotate90`       | `string` | `"Rotate 90°"`                     |
| `rotate180`      | `string` | `"Rotate 180°"`                    |
| `resetRotation`  | `string` | `"Reset Rotation"`                 |
| `resetCrop`      | `string` | `"Reset Crop"`                     |
| `emptyState`     | `string` | `"Open an image to get started"`   |

### Usage

```tsx
import { ImageCropper } from '@bartgarbiak/image-cropper';
import '@bartgarbiak/image-cropper/style.css';

// Defaults
<ImageCropper />

// Custom min crop size
<ImageCropper minCropWidth={100} minCropHeight={100} />

// Custom labels (e.g. i18n)
<ImageCropper
  labels={{
    rotation: 'Rotación',
    rotate90: 'Girar 90°',
    rotate180: 'Girar 180°',
    resetRotation: 'Restablecer rotación',
    resetCrop: 'Restablecer recorte',
    emptyState: 'Abra una imagen para comenzar',
  }}
/>
```

---

## Features

### Image Upload

Click the file input to load any image. The image is displayed inside a centred workspace area, scaled to fit within 70 % of the available space.

### Rotation (−45° to +45°)

A slider controls the rotation angle in 0.1° increments. The allowed range shrinks automatically when the current crop dimensions would become smaller than the minimum — the slider limits are recalculated via binary search (`findMaxRotation`).

### Crop Overlay

An axis-aligned rectangle is drawn on top of the rotated image. At zero rotation and no manual resize it matches the full image size. As rotation increases the crop shrinks to remain inside the image boundary.

### Corner Resize (drag)

Each corner has a 12 × 12 px hit target. Dragging a corner resizes the crop symmetrically (the crop stays centred when resizing). Dimensions are clamped so:

- They never go below `minCropWidth` / `minCropHeight`.
- All four corners remain inside the rotated image boundary.

Resizing resets the crop offset to the centre.

### Crop Move (drag)

Clicking and dragging inside the crop area moves the entire crop rectangle. The offset is clamped in real-time so that every corner of the crop stays within the rotated image boundary (`clampOffset`).

### 90° / 180° Rotation

Two buttons allow coarse rotation in 90° and 180° increments. The 90° button is automatically disabled when the resulting (swapped) image dimensions would violate the minimum crop size. Each coarse rotation resets the fine-tune slider and crop to their defaults.

### Reset Buttons

- **Reset Rotation** — sets both coarse and fine rotation to 0° and resets crop size + position.
- **Reset Crop** — restores the default (full-image) crop size and centres it.

---

## Geometry Model

All constraint math operates in a coordinate system centred on the image centre.

### Rotated-image containment

A screen-space point $(p_x, p_y)$ is inside the rotated image iff:

$$
|p_x \cos\theta + p_y \sin\theta| \le \frac{W}{2}
\quad\text{and}\quad
|-p_x \sin\theta + p_y \cos\theta| \le \frac{H}{2}
$$

where $W \times H$ is the displayed image size and $\theta$ is the rotation angle.

### Key functions

| Function | Purpose |
| --- | --- |
| `computeCropSize(W, H, θ)` | Largest axis-aligned rectangle with the image's aspect ratio that fits inside the rotated image (centred). |
| `clampCropDims(cW, cH, iW, iH, θ, minW, minH)` | Clamp arbitrary crop dimensions so a centred crop of that size fits inside the rotated image, respecting minimums. |
| `findMaxRotation(iW, iH, crop, minW, minH)` | Binary search (50 iterations) for the largest $|\theta| \le 45°$ where the effective crop still meets the minimum size constraints. |
| `clampOffset(ox, oy, cW, cH, iW, iH, θ)` | Iteratively push an offset $(o_x, o_y)$ inward until all four corners of the offset crop rectangle pass the containment test above. |

---

## Types

All types are exported from the package entry point.

```ts
interface ImageCropperProps {
  minCropWidth?: number;
  minCropHeight?: number;
  labels?: ImageCropperLabels;
}

interface ImageCropperLabels {
  rotation?: string;
  rotate90?: string;
  rotate180?: string;
  resetRotation?: string;
  resetCrop?: string;
  emptyState?: string;
}

interface Size  { width: number; height: number; }
interface Point { x: number;     y: number;      }
```

---

## Tech Stack

| Layer       | Library                |
| ----------- | ---------------------- |
| UI          | React 18               |
| Styling     | Pure CSS (custom props) |
| Language    | TypeScript 5 (strict)  |
| Bundler     | Vite 4 (library mode)  |

---

## License

[MIT](LICENSE)
