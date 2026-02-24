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

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RotationData {
  rotation: number;
  baseRotation: number;
}

export interface ChangeData {
  action: 'rotate' | 'crop';
  crop: CropData;
  rotation: RotationData;
}

export interface ImageCropperProps {
  imageSrc?: string | null;
  minCropWidth?: number;
  minCropHeight?: number;
  labels?: ImageCropperLabels;
  onCrop?: (data: CropData) => void;
  onRotate?: (data: RotationData) => void;
  onChange?: (data: ChangeData) => void;
}
