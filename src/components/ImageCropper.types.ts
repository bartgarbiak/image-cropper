export type CornerPos = 'tl' | 'tr' | 'bl' | 'br';

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export type DragMode =
  | { kind: 'corner'; corner: CornerPos }
  | { kind: 'move'; startX: number; startY: number; startOffset: Point };

export interface ImageCropperLabels {
  rotation?: string;
  rotate90?: string;
  rotate180?: string;
  resetRotation?: string;
  resetCrop?: string;
  emptyState?: string;
}

export interface ImageCropperProps {
  minCropWidth?: number;
  minCropHeight?: number;
  labels?: ImageCropperLabels;
}
