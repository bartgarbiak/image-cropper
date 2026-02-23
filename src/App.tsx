import React from 'react';
import { createGlobalStyle } from 'styled-components';
import ImageCropper from './components/ImageCropper';

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: sans-serif; }
`;

export default function App() {
  return (
    <>
      <GlobalStyle />
      <ImageCropper />
    </>
  );
}
