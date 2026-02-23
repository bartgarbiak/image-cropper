# ImageCropper — Documentation

A React component for interactive image rotation and cropping. Built with TypeScript, React 18, styled-components, and Vite.

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
├── index.html                       # Entry HTML (loads src/main.tsx)
├── package.json
├── tsconfig.json
├── vite.config.js
├── docs/
│   └── README.md                    # ← you are here
└── src/
    ├── main.tsx                     # ReactDOM root
    ├── App.tsx                      # Global styles + renders <ImageCropper>
    ├── vite-env.d.ts                # Vite client type reference
    └── components/
        └── ImageCropper.tsx         # Core component (all logic)
```

---

## `<ImageCropper>` Component

### Props

| Prop            | Type     | Default | Description                                     |
| --------------- | -------- | ------- | ----------------------------------------------- |
| `minCropWidth`  | `number` | `250`   | Minimum crop rectangle width in pixels.          |
| `minCropHeight` | `number` | `250`   | Minimum crop rectangle height in pixels.         |

### Usage

```tsx
import ImageCropper from './components/ImageCropper';

<ImageCropper />                          // defaults: 250 × 250 min
<ImageCropper minCropWidth={100} minCropHeight={100} />
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

### Reset Buttons

- **Reset Rotation** — sets rotation to 0° and resets crop size + position.
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

```ts
type CornerPos = 'tl' | 'tr' | 'bl' | 'br';

type DragMode =
  | { kind: 'corner'; corner: CornerPos }
  | { kind: 'move'; startX: number; startY: number; startOffset: Point };

interface Props {
  minCropWidth?: number;
  minCropHeight?: number;
}

interface Size  { width: number; height: number; }
interface Point { x: number;     y: number;      }
```

---

## Tech Stack

| Layer       | Library                |
| ----------- | ---------------------- |
| UI          | React 18               |
| Styling     | styled-components 6    |
| Language    | TypeScript 5 (strict)  |
| Bundler     | Vite 4                 |

---

## Publishing to npm

The `.github/workflows/publish.yml` workflow publishes the package automatically when a GitHub Release is created (or manually via `workflow_dispatch`).

### Setting up the npm token for 2FA-enabled accounts

When your npm account has **"Require 2FA for write actions"** enabled, a regular publish token will be rejected in CI because there is no way to enter the OTP interactively. You must use an **automation-type** token, which bypasses the 2FA OTP requirement while still being protected by your account's 2FA for interactive logins.

**Steps:**

1. Log in to [npmjs.com](https://www.npmjs.com) and go to **Account Settings → Access Tokens**.
2. Click **Generate New Token** and choose one of:
   - **Granular Access Token** (recommended) — select the package, set permission to **Read and Write**, and set "Require 2FA" to **No (automation token)**.
   - **Classic Token** — choose type **Automation**. Automation tokens bypass 2FA for CI/CD publish operations.
3. Copy the generated token.
4. In your GitHub repository, go to **Settings → Secrets and variables → Actions** and add a secret named **`NPM_TOKEN`** with the token value.

The workflow then runs:

```bash
npm publish --provenance --access public
```

- `--provenance` attaches a signed OIDC attestation (requires the `id-token: write` permission in the workflow) so package consumers can verify the build came from this GitHub Actions workflow.
- `--access public` is required for scoped packages (`@scope/pkg`) to be published publicly.

### Summary

| Token type | Bypasses 2FA OTP in CI | Notes |
| --- | --- | --- |
| Classic — **Publish** | ❌ | Requires OTP; not usable in CI with 2FA |
| Classic — **Automation** | ✅ | Use this for CI/CD |
| Granular Access Token | ✅ | Fine-grained control; recommended |

---

## License

[MIT](LICENSE)
