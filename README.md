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
├── test/                            # Vitest test suites
│   ├── helpers.spec.ts
│   ├── useHistory.spec.ts
│   └── ImageCropper.spec.tsx
└── src/
    ├── index.ts                     # Barrel exports
    ├── utils/
    │   └── useHistory.ts            # Undo/redo history hook
    └── components/
        ├── ImageCropper.tsx          # Core component
        ├── ImageCropper.types.ts     # Type definitions
        ├── ImageCropper.css          # Component styles
        └── helpers/                  # Geometry helpers
            ├── computeCropSize.ts
            ├── clampCropDims.ts
            ├── findMaxRotation.ts
            └── clampOffset.ts
```

---

## `<ImageCropper>` Component

### Props

| Prop               | Type                                    | Default   | Description                                                              |
| ------------------ | --------------------------------------- | --------- | ------------------------------------------------------------------------ |
| `imageSrc`         | `string \| null`                        | `null`    | Image source URL or data URL to crop.                                    |
| `minCropWidth`     | `number`                                | `250`     | Minimum crop rectangle width in pixels.                                  |
| `minCropHeight`    | `number`                                | `250`     | Minimum crop rectangle height in pixels.                                 |
| `labels`           | `ImageCropperLabels`                    | See below | Override any UI label string.                                            |
| `onCrop`           | `(data: CropData) => void`              | —         | Fired after the user stops cropping for 500 ms.                          |
| `onRotate`         | `(data: RotationData) => void`          | —         | Fired after the user stops rotating for 500 ms.                          |
| `onChange`         | `(data: ChangeData) => void`            | —         | Fired after any crop or rotation commit (same 500 ms debounce).          |
| `onHistoryChange`  | `(canUndo: boolean, canRedo: boolean) => void` | — | Fired whenever the undo/redo availability changes. Use this to keep external buttons in sync. |
| `ref`              | `React.Ref<ImageCropperRef>`            | —         | Forward ref giving access to `undo`, `redo`, `canUndo`, `canRedo`, `getHistory`. |

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

#### Event Data Types

**`CropData`**
```ts
{
  x: number;      // horizontal position of top-left corner
  y: number;      // vertical position of top-left corner
  width: number;  // width of the cropped area
  height: number; // height of the cropped area
}
```

**`RotationData`**
```ts
{
  rotation: number;      // fine-tune rotation (-45° to 45°)
  baseRotation: number;  // coarse rotation (0°, 90°, 180°, 270°)
}
```

**`ChangeData`**
```ts
{
  action: 'rotate' | 'crop';
  crop: CropData;
  rotation: RotationData;
}
```

### Usage

```tsx
import { ImageCropper, type ImageCropperRef } from '@bartgarbiak/image-cropper';
import '@bartgarbiak/image-cropper/style.css';
import { useRef, useState } from 'react';

function MyComponent() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const cropperRef = useRef<ImageCropperRef>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImageSrc(URL.createObjectURL(file));
  };

  return (
    <>
      <input type="file" accept="image/*" onChange={handleFileUpload} />

      <button onClick={() => cropperRef.current?.undo()} disabled={!canUndo}>Undo</button>
      <button onClick={() => cropperRef.current?.redo()} disabled={!canRedo}>Redo</button>

      <ImageCropper
        ref={cropperRef}
        imageSrc={imageSrc}
        onHistoryChange={(u, r) => { setCanUndo(u); setCanRedo(r); }}
        onCrop={(crop) => console.log('Crop:', crop)}
        onRotate={(rotation) => console.log('Rotation:', rotation)}
        onChange={(data) => console.log('Change:', data)}
      />
    </>
  );
}
```

> **Note on event timing** — `onCrop`, `onRotate`, and `onChange` are debounced: they fire only after the user has stopped interacting (dragging a corner, moving the crop, or adjusting the slider) for **500 ms**. Discrete button actions (Rotate 90°, Rotate 180°, Reset Rotation, Reset Crop) commit immediately without the delay. This same debounce controls when undo/redo history entries are created, so every entry represents a "resting" state rather than a frame in the middle of a drag.

**Custom min crop size**
```tsx
<ImageCropper imageSrc={imageSrc} minCropWidth={100} minCropHeight={100} />
```

**Custom labels (i18n)**
```tsx
<ImageCropper
  imageSrc={imageSrc}
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

### Undo / Redo

Every "settled" interaction is pushed to a history stack. An interaction is considered settled when the user stops acting for **500 ms** (slider, drag corner, drag move). Discrete actions (Rotate 90°, 180°, Reset Rotation, Reset Crop) commit to history immediately.

Control undo/redo from outside the component via a forwarded ref:

```tsx
const ref = useRef<ImageCropperRef>(null);

// call these from external buttons
ref.current?.undo();
ref.current?.redo();

// read availability
ref.current?.canUndo; // boolean
ref.current?.canRedo; // boolean

// inspect the full stack
ref.current?.getHistory(); // { past, present, future }
```

Use `onHistoryChange` to keep external UI (e.g. toolbar buttons) in sync without polling the ref:

```tsx
<ImageCropper
  ref={ref}
  onHistoryChange={(canUndo, canRedo) => {
    setCanUndo(canUndo);
    setCanRedo(canRedo);
  }}
/>
```

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
  imageSrc?: string | null;
  minCropWidth?: number;
  minCropHeight?: number;
  labels?: ImageCropperLabels;
  onCrop?: (data: CropData) => void;
  onRotate?: (data: RotationData) => void;
  onChange?: (data: ChangeData) => void;
  /** Fired when canUndo / canRedo change — use this to drive external buttons. */
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

/** Exposed via forwardRef — access with useRef<ImageCropperRef>(null) */
interface ImageCropperRef {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  getHistory: () => {
    past: CropperState[];
    present: CropperState;
    future: CropperState[];
  };
}

interface CropperState {
  rotation: number;
  baseRotation: number;
  cropSize: { width: number; height: number } | null;
  cropOffset: { x: number; y: number };
}

interface ImageCropperLabels {
  rotation?: string;
  rotate90?: string;
  rotate180?: string;
  resetRotation?: string;
  resetCrop?: string;
  emptyState?: string;
}

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RotationData {
  rotation: number;
  baseRotation: number;
}

interface ChangeData {
  action: 'rotate' | 'crop';
  crop: CropData;
  rotation: RotationData;
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
