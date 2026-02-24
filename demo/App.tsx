import React, { useCallback, useState } from 'react';
import './index.css';
import { ImageCropper } from '../src';

export default function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(URL.createObjectURL(file));
  }, [imageSrc]);

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleUpload} />
      <ImageCropper imageSrc={imageSrc} />
    </div>
  );
}
