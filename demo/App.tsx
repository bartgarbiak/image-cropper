import React, { useCallback, useState, useRef } from 'react';
import './index.css';
import { ImageCropper, type ImageCropperRef } from '../src';

export default function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const cropperRef = useRef<ImageCropperRef>(null);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(URL.createObjectURL(file));
  }, [imageSrc]);

  const handleHistoryChange = useCallback((u: boolean, r: boolean) => {
    setCanUndo(u);
    setCanRedo(r);
  }, []);

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleUpload} />
      <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => cropperRef.current?.undo()}
          disabled={!canUndo}
        >
          Undo
        </button>
        <button
          onClick={() => cropperRef.current?.redo()}
          disabled={!canRedo}
        >
          Redo
        </button>
      </div>
      <ImageCropper
        ref={cropperRef}
        imageSrc={imageSrc}
        onHistoryChange={handleHistoryChange}
      />
    </div>
  );
}
